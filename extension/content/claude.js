;(function () {
// Content script for claude.ai — wrapped in IIFE so re-injection doesn't cause
// duplicate const declarations in the shared isolated world.
if (window.__COLOSSEUM_CLAUDE__) return
window.__COLOSSEUM_CLAUDE__ = true

// ── Selectors ─────────────────────────────────────────────────────────────────
const SEL = {
  input: [
    'div[contenteditable="true"].ProseMirror',
    'div[contenteditable="true"][data-placeholder]',
    'div[contenteditable="true"]',
  ],
  sendBtn: [
    'button[aria-label="Send message"]',
    'button[aria-label="Send Message"]',
    'button[type="submit"]',
  ],
  response: [
    '[data-testid="ai-message"]',
    '.font-claude-message',
    '[data-is-streaming]',
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
  if (!el) throw new Error('[Colosseum] claude.ai input not found')
  el.focus()
  document.execCommand('selectAll', false, null)
  document.execCommand('insertText', false, text)
  await sleep(300)
}

async function clickSend() {
  const btn = findEl(SEL.sendBtn)
  if (!btn) throw new Error('[Colosseum] claude.ai send button not found')
  btn.click()
  await sleep(600)
}

// ── Response extraction ───────────────────────────────────────────────────────
function extractLastResponse() {
  const all = findAll(SEL.response)
  if (!all.length) throw new Error('[Colosseum] No response found on claude.ai')
  return all[all.length - 1].innerText.trim()
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

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

})()
