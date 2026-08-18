;(function () {
// Content script for claude.ai — wrapped in IIFE so re-injection doesn't cause
// duplicate const declarations in the shared isolated world.
if (window.__COLOSSEUM_CLAUDE__) window.__COLOSSEUM_CLAUDE__.cleanup()

// ── Selectors ─────────────────────────────────────────────────────────────────
const SEL = {
  input: [
    'div[data-testid="chat-input"]',
    'div[contenteditable="true"].ProseMirror',
    'div[contenteditable="true"]',
  ],
  sendBtn: [
    'button[data-testid="chat-input-send"]',
    'button[aria-label="Send message"]',
  ],
  // Assistant turn wrapper. NOT the message body — see extractLastResponse.
  responseRow: [
    '[data-testid="transcript-row"][data-perf-row="assistant"]',
    '[data-perf-row="assistant"]',
  ],
  // Rendered markdown body inside a turn. A turn with tool use has several.
  responseBody: ['.standard-markdown'],
}

// How long the transcript must sit idle before we call a reply finished.
// Tool use makes Claude go streaming -> idle -> streaming again; without this
// we'd resolve at the first pause and capture a partial answer.
const IDLE_SETTLE_MS = 2000

// ── Message listener ──────────────────────────────────────────────────────────
function onMessage(msg, _sender, sendResponse) {
  if (msg.type === 'PING') { sendResponse({ pong: true }); return }
  if      (msg.type === 'SEND_PROMPT' || msg.type === 'SEND_PROMPT_NOWAIT')
                                        handleSendOnly(msg.content, msg.requestId)
  else if (msg.type === 'FETCH_RESPONSE') handleFetch(msg.requestId)
}
chrome.runtime.onMessage.addListener(onMessage)

window.__COLOSSEUM_CLAUDE__ = {
  cleanup() { try { chrome.runtime.onMessage.removeListener(onMessage) } catch { /* already gone */ } }
}

async function handleSendOnly(content, requestId) {
  try {
    await waitForEl(SEL.input, 12000)
    await typeIntoEditor(content)
    await clickSend()
    send({ type: 'SEND_ACK', requestId })
  } catch (err) {
    send({ type: 'PROMPT_RESPONSE', requestId, error: err.message })
  }
}

async function handleFetch(requestId) {
  try {
    // Wait for generation to begin. If already done (fast model), swallow timeout.
    await waitForStreamingToStart(10000).catch(() => {})
    // Now wait for generation to finish
    await waitForStreamingComplete(90000)
    await sleep(300)
    const text = extractLastResponse()
    send({ type: 'PROMPT_RESPONSE', requestId, content: text })
  } catch (err) {
    send({ type: 'PROMPT_RESPONSE', requestId, error: err?.message ?? String(err) })
  }
}

// True only when we can positively confirm generation is in progress.
function isStreaming() {
  return !!document.querySelector('[data-is-streaming="true"]')
}

// Guard against a future UI change silently disabling our streaming detection.
// If the attribute vanishes entirely, we must fail loudly rather than treat
// "can't tell" as "finished" — that path returns the PREVIOUS turn's text.
function assertStreamingObservable() {
  if (!document.querySelector('[data-is-streaming]')) {
    throw new Error(
      '[Colosseum] claude.ai streaming indicator not found — selectors are stale, refusing to guess'
    )
  }
}

// Wait until Claude starts generating.
function waitForStreamingToStart(timeout) {
  assertStreamingObservable()
  return waitForCondition(() => isStreaming(), timeout)
}

// Wait until Claude has been idle continuously for IDLE_SETTLE_MS.
// A single idle sample is not enough: tool use pauses streaming mid-reply.
function waitForStreamingComplete(timeout) {
  assertStreamingObservable()
  let idleSince = null
  return waitForCondition(() => {
    if (isStreaming()) { idleSince = null; return false }
    if (idleSince === null) idleSince = Date.now()
    return Date.now() - idleSince >= IDLE_SETTLE_MS
  }, timeout)
}

// ── Editor interaction ────────────────────────────────────────────────────────
async function typeIntoEditor(text) {
  const el = findEl(SEL.input)
  if (!el) throw new Error('[Colosseum] claude.ai input not found')
  el.focus()
  document.execCommand('selectAll', false, null)
  document.execCommand('insertText', false, text)
  await sleep(300)
}

// Click the real send button. The old synthetic-Enter approach depended on
// ProseMirror's key handling; the button carries a stable testid.
async function clickSend() {
  const btn = await waitForCondition(() => {
    const b = findEl(SEL.sendBtn)
    return b && !b.disabled ? b : null
  }, 8000).catch(() => null)

  if (!btn) throw new Error('[Colosseum] claude.ai send button not found or stayed disabled')
  btn.click()
  await sleep(600)
}

// ── Response extraction ───────────────────────────────────────────────────────
// The transcript is virtualized (data-rocksteady-sizer), so only rows near the
// viewport exist in the DOM. The last assistant row is always rendered, which is
// all we need — but this is why scraping full history here would lose messages.
function extractLastResponse() {
  const rows = findAll(SEL.responseRow)
  if (!rows.length) throw new Error('[Colosseum] No assistant turn found on claude.ai')

  const last = rows[rows.length - 1]

  // A turn may hold several markdown blocks separated by tool-use stages.
  // Concatenate them and drop the tool status pills, which are UI chrome.
  const bodies = [...last.querySelectorAll(SEL.responseBody.join(','))]
  if (!bodies.length) {
    throw new Error('[Colosseum] Assistant turn found but no message body — selectors are stale')
  }

  return bodies
    .map(b => {
      const clone = b.cloneNode(true)
      clone.querySelectorAll(
        '[data-testid="tool-status-pill"], [data-testid="tool-status-spark"], [data-testid="tool-status-caret"]'
      ).forEach(el => el.remove())
      return clone.innerText.trim()
    })
    .filter(Boolean)
    .join('\n\n')
}

// ── DOM helpers ───────────────────────────────────────────────────────────────
function findEl(selectors) {
  for (const s of selectors) {
    const el = document.querySelector(s)
    if (el) return el
  }
  return null
}

function findAll(selectors) {
  for (const s of selectors) {
    const els = document.querySelectorAll(s)
    if (els.length) return Array.from(els)
  }
  return []
}

function waitForEl(selectors, timeout) {
  return new Promise((resolve, reject) => {
    const el = findEl(selectors)
    if (el) return resolve(el)
    const observer = new MutationObserver(() => {
      const found = findEl(selectors)
      if (found) { observer.disconnect(); resolve(found) }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    setTimeout(() => { observer.disconnect(); reject(new Error('[Colosseum] Input not found on claude.ai')) }, timeout)
  })
}

function waitForCondition(condition, timeout) {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    function check() {
      const result = condition()
      if (result) return resolve(result)
      if (Date.now() - start > timeout) return reject(new Error('[Colosseum] Timed out'))
      setTimeout(check, 300)
    }
    check()
  })
}

function send(msg) {
  try { chrome.runtime.sendMessage(msg) } catch { /* extension reloaded — context gone */ }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

})()
