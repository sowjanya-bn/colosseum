// Content script for claude.ai
// Receives SEND_PROMPT from background, types into the editor, waits for the
// response to finish streaming, then sends the text back.
//
// ── Selectors ────────────────────────────────────────────────────────────────
// These are the most likely to break when claude.ai updates its UI.
// Check the DOM in DevTools if things stop working and update accordingly.
const SEL = {
  // Main composer input (ProseMirror contenteditable)
  input: [
    'div[contenteditable="true"].ProseMirror',
    'div[contenteditable="true"][data-placeholder]',
    'div[contenteditable="true"]',
  ],
  // Send / submit button
  sendBtn: [
    'button[aria-label="Send message"]',
    'button[aria-label="Send Message"]',
    'button[type="submit"]',
  ],
  // Each assistant (Claude) message container
  response: [
    '[data-testid="ai-message"]',
    '.font-claude-message',
    '[data-is-streaming]',
  ],
  // Appears while Claude is generating; disappears when done
  stopBtn: [
    'button[aria-label="Stop response"]',
    'button[aria-label="Stop Response"]',
    'button[aria-label="Stop generating"]',
  ],
}

// ── Message listener ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'SEND_PROMPT') {
    handlePrompt(msg.content, msg.requestId)
  }
})

async function handlePrompt(content, requestId) {
  try {
    // Count existing responses so we can detect a new one arriving
    const before = countResponses()

    await waitForEl(SEL.input, 12000)
    await typeIntoEditor(content)
    await clickSend()
    await waitForNewResponse(before)
    const text = extractLastResponse()

    chrome.runtime.sendMessage({ type: 'PROMPT_RESPONSE', requestId, content: text })
  } catch (err) {
    chrome.runtime.sendMessage({ type: 'PROMPT_RESPONSE', requestId, error: err.message })
  }
}

// ── Editor interaction ───────────────────────────────────────────────────────
async function typeIntoEditor(text) {
  const el = findEl(SEL.input)
  if (!el) throw new Error('[Colosseum] claude.ai input not found')

  el.focus()
  // Clear whatever is already there
  document.execCommand('selectAll', false, null)
  // Insert text — this fires the input events ProseMirror listens to
  document.execCommand('insertText', false, text)

  await sleep(300)
}

async function clickSend() {
  const btn = findEl(SEL.sendBtn)
  if (!btn) throw new Error('[Colosseum] claude.ai send button not found')
  btn.click()
  await sleep(600)
}

// ── Response detection ───────────────────────────────────────────────────────
// Strategy:
//   1. Wait for a new response element to appear (N+1 vs before)
//   2. Observe that element with a MutationObserver
//   3. When content hasn't changed for 2 seconds, treat as complete
async function waitForNewResponse(responsesBeforeSend) {
  // Wait up to 15s for the new message to appear
  const el = await waitForCondition(
    () => {
      const all = findAll(SEL.response)
      return all.length > responsesBeforeSend ? all[all.length - 1] : null
    },
    15000
  )

  // Now wait for that element to stop mutating (streaming complete)
  await waitForStable(el, 2000, 120000)
  await sleep(300)
}

function extractLastResponse() {
  const all = findAll(SEL.response)
  if (!all.length) throw new Error('[Colosseum] No response found on claude.ai')
  return all[all.length - 1].innerText.trim()
}

function countResponses() {
  return findAll(SEL.response).length
}

// ── DOM helpers ──────────────────────────────────────────────────────────────
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

// Polls condition() every 200ms until it returns a truthy value or timeout
function waitForCondition(condition, timeout) {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    function check() {
      const result = condition()
      if (result) return resolve(result)
      if (Date.now() - start > timeout) return reject(new Error('[Colosseum] Timed out waiting for response'))
      setTimeout(check, 200)
    }
    check()
  })
}

// Waits for el to stop mutating for `quietMs` ms, or rejects after `timeout`
function waitForStable(el, quietMs, timeout) {
  return new Promise((resolve, reject) => {
    let quietTimer = null

    function resetTimer() {
      clearTimeout(quietTimer)
      quietTimer = setTimeout(() => {
        observer.disconnect()
        resolve()
      }, quietMs)
    }

    const observer = new MutationObserver(resetTimer)
    observer.observe(el, { childList: true, subtree: true, characterData: true })
    resetTimer() // start the clock immediately in case el is already stable

    setTimeout(() => {
      observer.disconnect()
      clearTimeout(quietTimer)
      reject(new Error('[Colosseum] Response never stabilized'))
    }, timeout)
  })
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
    setTimeout(() => { observer.disconnect(); reject(new Error('[Colosseum] Element not found: ' + selectors[0])) }, timeout)
  })
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}
