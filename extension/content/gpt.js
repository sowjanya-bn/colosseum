;(function () {
// Content script for chatgpt.com — wrapped in IIFE so re-injection doesn't cause
// duplicate const declarations in the shared isolated world.
if (window.__COLOSSEUM_GPT__) return
window.__COLOSSEUM_GPT__ = true

// ── Selectors ─────────────────────────────────────────────────────────────────
const SEL = {
  input: [
    'div#prompt-textarea[contenteditable="true"]',
    'div[contenteditable="true"]',
  ],
  response: [
    '[data-message-author-role="assistant"]',
    '[data-testid^="conversation-turn-"][data-testid$="-assistant"]',
    '.agent-turn',
  ],
}

// ── Message listener ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if      (msg.type === 'SEND_PROMPT' || msg.type === 'SEND_PROMPT_NOWAIT')
                                          handleSendOnly(msg.content, msg.requestId)
  else if (msg.type === 'FETCH_RESPONSE') handleFetch(msg.requestId)
})

async function handleSendOnly(content, requestId) {
  try {
    await waitForEl(SEL.input, 12000)
    await typeIntoEditor(content)
    await clickSend()
    chrome.runtime.sendMessage({ type: 'SEND_ACK', requestId })
  } catch (err) {
    chrome.runtime.sendMessage({ type: 'PROMPT_RESPONSE', requestId, error: err.message })
  }
}

async function handleFetch(requestId) {
  try {
    await sleep(300)
    const text = extractLastResponse()
    chrome.runtime.sendMessage({ type: 'PROMPT_RESPONSE', requestId, content: text })
  } catch (err) {
    chrome.runtime.sendMessage({ type: 'PROMPT_RESPONSE', requestId, error: err.message })
  }
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
  const byTestId = document.querySelector('button[data-testid="send-button"]')
  if (byTestId && !byTestId.disabled) return byTestId

  const input = findEl(SEL.input)
  if (!input) return null

  let container = input.parentElement
  for (let i = 0; i < 6; i++) {
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
  if (!all.length) throw new Error('[Colosseum] No response found on chatgpt.com')
  const last = all[all.length - 1]
  const inner = last.querySelector('.markdown, [class*="markdown"], .prose, [data-message-content]')
  const root = inner ?? last
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
