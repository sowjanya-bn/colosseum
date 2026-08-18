;(function () {
// Content script for chatgpt.com — wrapped in IIFE so re-injection doesn't cause
// duplicate const declarations in the shared isolated world.
if (window.__COLOSSEUM_GPT__) window.__COLOSSEUM_GPT__.cleanup()

// ── Selectors ─────────────────────────────────────────────────────────────────
const SEL = {
  input: [
    'div#prompt-textarea[contenteditable="true"]',
    'div[contenteditable="true"]',
  ],
  // Assistant turn wrapper. Turn testids are now bare indices
  // (conversation-turn-38) with no role suffix, so match on the role attribute.
  response: [
    '[data-message-author-role="assistant"]',
    '[data-turn="assistant"]',
    '.agent-turn',
  ],
  // Rendered markdown body inside a turn.
  responseBody: ['.markdown.prose', '.markdown', '[class*="markdown"]'],
}

// ── Message listener ──────────────────────────────────────────────────────────
function onMessage(msg, _sender, sendResponse) {
  if (msg.type === 'PING') { sendResponse({ pong: true }); return }
  if      (msg.type === 'SEND_PROMPT' || msg.type === 'SEND_PROMPT_NOWAIT')
                                          handleSendOnly(msg.content, msg.requestId)
  else if (msg.type === 'FETCH_RESPONSE') handleFetch(msg.requestId)
}
chrome.runtime.onMessage.addListener(onMessage)

window.__COLOSSEUM_GPT__ = {
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
    // Wait for generation to begin (stop button appears or send button gets disabled).
    // If already done (very fast model), this times out — swallow and proceed.
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

function send(msg) {
  try { chrome.runtime.sendMessage(msg) } catch { /* extension reloaded — context gone */ }
}

// Mid-stream the send button is REMOVED and replaced by the stop button — it does
// not merely go disabled. So streaming is detected by presence, never by
// send.disabled: at rest with an empty composer the send button is disabled too,
// and treating that as "streaming" hangs until timeout.
const STOP_BTN = 'button[data-testid="stop-button"], button[aria-label="Stop answering"]'
const SEND_BTN = 'button[data-testid="send-button"]'
// Set on the scroll root only while a reply is generating. Primary signal.
const STREAM_FLAG = '[data-stream-active], [data-streaming-response-status]'

// How long the page must sit idle before we call a reply finished. ChatGPT goes
// streaming -> idle -> streaming again across tool calls (search, code, images);
// a single idle sample resolves at the first pause and truncates the answer.
const IDLE_SETTLE_MS = 2000

// True only when we can positively confirm generation is in progress.
function isStreaming() {
  return !!(document.querySelector(STREAM_FLAG) || document.querySelector(STOP_BTN))
}

// Guard against a UI change silently disabling streaming detection. Exactly one
// of send/stop is in the DOM at any time; if neither is, we cannot tell running
// from finished — and the old code called that "finished", which returns the
// PREVIOUS turn's text with no error.
function assertStreamingObservable() {
  if (!document.querySelector(STOP_BTN) && !document.querySelector(SEND_BTN)) {
    throw new Error(
      '[Colosseum] chatgpt.com send/stop button not found — selectors are stale, refusing to guess'
    )
  }
}

// Wait until ChatGPT starts generating.
function waitForStreamingToStart(timeout) {
  assertStreamingObservable()
  return waitForCondition(() => isStreaming(), timeout)
}

// Wait until ChatGPT has been idle continuously for IDLE_SETTLE_MS.
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
  if (!el) throw new Error('[Colosseum] chatgpt.com input not found')
  el.focus()
  document.execCommand('selectAll', false, null)
  document.execCommand('insertText', false, text)
  el.dispatchEvent(new InputEvent('input', { bubbles: true }))
  await sleep(600)
}

async function clickSend() {
  const btn = await waitForCondition(() => findSendButton(), 8000)
  btn.click()
  await sleep(800)
}

function findSendButton() {
  const byTestId = document.querySelector(SEND_BTN)
  if (byTestId && !byTestId.disabled) return byTestId

  const input = findEl(SEL.input)
  if (!input) return null

  // Geometric fallback: walk up from the input looking for an icon button.
  // Must exclude the composer's other icon buttons — attach, dictation, voice
  // mode all sit in the same subtree and all carry an <svg>. Clicking one of
  // those instead of send opens a file dialog or starts recording.
  const NOT_SEND = /attach|file|upload|dictat|microphone|voice|record|tool|model|search|canvas|menu/i

  let container = input.parentElement
  for (let i = 0; i < 6; i++) {
    if (!container) break
    const enabled = [...container.querySelectorAll('button')].find(b => {
      if (b.disabled || !b.querySelector('svg')) return false
      const hint = [
        b.getAttribute('aria-label'),
        b.getAttribute('data-testid'),
        b.getAttribute('title'),
      ].filter(Boolean).join(' ')
      return !NOT_SEND.test(hint)
    })
    if (enabled) return enabled
    container = container.parentElement
  }
  return null
}

// ── Response extraction ───────────────────────────────────────────────────────
function extractLastResponse() {
  const all = findAll(SEL.response)
  if (!all.length) throw new Error('[Colosseum] No response found on chatgpt.com')
  const last = all[all.length - 1]
  const inner = last.querySelector(SEL.responseBody.join(','))
  if (!inner) {
    throw new Error('[Colosseum] Assistant turn found but no message body — selectors are stale')
  }
  const root = inner
  // Clone so we can strip image/media elements without mutating the live DOM
  const clone = root.cloneNode(true)
  clone.querySelectorAll('img, picture, video, canvas, figure, [data-testid*="image"], .image-gen-container').forEach(el => el.remove())
  return clone.innerText.trim()
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
    setTimeout(() => { observer.disconnect(); reject(new Error('[Colosseum] Input not found on chatgpt.com')) }, timeout)
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

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

})()
