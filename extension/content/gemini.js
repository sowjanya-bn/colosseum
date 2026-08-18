;(function () {
// Content script for gemini.google.com — mirrors the GPT script pattern.
if (window.__COLOSSEUM_GEMINI__) return
window.__COLOSSEUM_GEMINI__ = true

// ── Selectors ─────────────────────────────────────────────────────────────────
const SEL = {
  input: [
    'div.ql-editor[contenteditable="true"]',
    'rich-textarea div[contenteditable="true"]',
    'div[contenteditable="true"]',
  ],
  response: [
    'model-response .markdown',
    '.response-container .markdown',
    'message-content',
    '.model-response-text',
  ],
}

// ── Message listener ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'PING') { sendResponse({ pong: true }); return }
  if      (msg.type === 'SEND_PROMPT' || msg.type === 'SEND_PROMPT_NOWAIT')
                                          handleSendOnly(msg.content, msg.requestId)
  else if (msg.type === 'FETCH_RESPONSE') handleFetch(msg.requestId)
})

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
    await waitForStreamingToStart(10000).catch(() => {})
    await waitForStreamingComplete(90000)
    await sleep(300)
    const text = extractLastResponse()
    send({ type: 'PROMPT_RESPONSE', requestId, content: text })
  } catch (err) {
    send({ type: 'PROMPT_RESPONSE', requestId, error: err.message })
  }
}

// Gemini shows a loading/stop indicator while generating.
function waitForStreamingToStart(timeout) {
  return waitForCondition(() => {
    const sendBtn = findSendButton()
    if (!sendBtn) return false
    return sendBtn.disabled
  }, timeout)
}

function waitForStreamingComplete(timeout) {
  return waitForCondition(() => {
    const sendBtn = findSendButton()
    if (sendBtn && !sendBtn.disabled) return true
    if (!sendBtn) return true  // no button — assume done
    return false
  }, timeout)
}

// ── Editor interaction ────────────────────────────────────────────────────────
async function typeIntoEditor(text) {
  const el = findEl(SEL.input)
  if (!el) throw new Error('[Colosseum] gemini.google.com input not found')
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
  // Known Gemini send button selectors
  const candidates = [
    document.querySelector('button[aria-label="Send message"]'),
    document.querySelector('button[data-test-id="send-button"]'),
    document.querySelector('button.send-button'),
  ]
  const direct = candidates.find(b => b && !b.disabled)
  if (direct) return direct

  // Walk up from input
  const input = findEl(SEL.input)
  if (!input) return null
  let container = input.parentElement
  for (let i = 0; i < 8; i++) {
    if (!container) break
    const btns = [...container.querySelectorAll('button')]
    const enabled = btns.find(b => !b.disabled && b.querySelector('svg'))
    if (enabled) return enabled
    container = container.parentElement
  }
  return null
}

// ── Response extraction ───────────────────────────────────────────────────────
function extractLastResponse() {
  const all = findAll(SEL.response)
  if (!all.length) throw new Error('[Colosseum] No response found on gemini.google.com')
  const last = all[all.length - 1]
  const clone = last.cloneNode(true)
  clone.querySelectorAll('img, picture, video, canvas, figure, button').forEach(el => el.remove())
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
    setTimeout(() => { observer.disconnect(); reject(new Error('[Colosseum] Input not found on gemini.google.com')) }, timeout)
  })
}

function waitForCondition(condition, timeout) {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    function check() {
      const result = condition()
      if (result) return resolve(result)
      if (Date.now() - start > timeout) return reject(new Error('[Colosseum] Timed out waiting for send button'))
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
