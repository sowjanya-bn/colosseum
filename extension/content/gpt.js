// Content script for chatgpt.com
// Same structure as claude.js — receives SEND_PROMPT, types, waits, extracts.
//
// ── Selectors ────────────────────────────────────────────────────────────────
const SEL = {
  // Main chat input (contenteditable div)
  input: [
    'div#prompt-textarea[contenteditable="true"]',
    'div[contenteditable="true"]#prompt-textarea',
    'div[contenteditable="true"][data-id="root"]',
    'div[contenteditable="true"]',
  ],
  // Send button
  sendBtn: [
    'button[data-testid="send-button"]',
    'button[aria-label="Send prompt"]',
    'button[aria-label="Send message"]',
  ],
  // Each assistant message container
  response: [
    '[data-message-author-role="assistant"]',
    '.agent-turn',
  ],
  // Appears while GPT is generating
  stopBtn: [
    'button[data-testid="stop-button"]',
    'button[aria-label="Stop streaming"]',
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
  if (!el) throw new Error('[Colosseum] chatgpt.com input not found')

  el.focus()
  document.execCommand('selectAll', false, null)
  document.execCommand('insertText', false, text)

  await sleep(300)
}

async function clickSend() {
  // ChatGPT's send button can be briefly disabled while input is processing
  await waitForCondition(() => {
    const btn = findEl(SEL.sendBtn)
    return btn && !btn.disabled ? btn : null
  }, 5000)

  const btn = findEl(SEL.sendBtn)
  if (!btn) throw new Error('[Colosseum] chatgpt.com send button not found')
  btn.click()
  await sleep(600)
}

// ── Response detection ───────────────────────────────────────────────────────
async function waitForNewResponse(responsesBeforeSend) {
  const el = await waitForCondition(
    () => {
      const all = findAll(SEL.response)
      return all.length > responsesBeforeSend ? all[all.length - 1] : null
    },
    15000
  )

  await waitForStable(el, 2000, 120000)
  await sleep(300)
}

function extractLastResponse() {
  const all = findAll(SEL.response)
  if (!all.length) throw new Error('[Colosseum] No response found on chatgpt.com')
  // ChatGPT wraps the actual prose in .markdown or similar — innerText is reliable
  return all[all.length - 1].innerText.trim()
}

function countResponses() {
  return findAll(SEL.response).length
}

// ── DOM helpers (same as claude.js) ─────────────────────────────────────────
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
    resetTimer()

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
