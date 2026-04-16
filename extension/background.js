// ── Tab registry ────────────────────────────────────────────────────────────
// One dedicated tab per model per Colosseum session.
// Tabs are opened fresh (new conversation) on first use and kept until closed.
const modelTabs = { claude: null, gpt: null }

const NEW_URLS = {
  claude: 'https://claude.ai/new',
  gpt: 'https://chatgpt.com/',
}

// ── Pending requests ────────────────────────────────────────────────────────
// requestId -> { colosseumTabId }
const pending = {}

// ── Message routing ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'COLOSSEUM_SEND') {
    handleSend(msg, sender.tab.id)
  } else if (msg.type === 'PROMPT_RESPONSE') {
    handleResponse(msg)
  }
  // return false = no async sendResponse needed
})

async function handleSend({ model, content, requestId }, colosseumTabId) {
  try {
    const tabId = await ensureTab(model)
    pending[requestId] = { colosseumTabId }
    await chrome.tabs.sendMessage(tabId, { type: 'SEND_PROMPT', content, requestId })
  } catch (err) {
    replyToColosseum(colosseumTabId, requestId, null, err.message)
  }
}

function handleResponse({ requestId, content, error }) {
  const p = pending[requestId]
  if (!p) return
  delete pending[requestId]
  replyToColosseum(p.colosseumTabId, requestId, content, error)
}

function replyToColosseum(tabId, requestId, content, error) {
  chrome.tabs.sendMessage(tabId, { type: 'COLOSSEUM_RESPONSE', requestId, content, error })
    .catch(() => {}) // Colosseum tab may have been closed
}

// ── Tab management ──────────────────────────────────────────────────────────
// Each session gets a dedicated tab. Always opens a fresh conversation.
// Reuses the same tab for subsequent messages in the same session.
async function ensureTab(model) {
  // Verify stored tab is still alive
  if (modelTabs[model] != null) {
    try {
      await chrome.tabs.get(modelTabs[model])
      return modelTabs[model] // still alive — reuse it
    } catch {
      modelTabs[model] = null // tab was closed
    }
  }

  // Open a fresh conversation tab (background, doesn't steal focus)
  const tab = await chrome.tabs.create({ url: NEW_URLS[model], active: false })
  modelTabs[model] = tab.id

  // Wait for the page to finish loading
  await new Promise(resolve => {
    function listener(tabId, info) {
      if (tabId === tab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener)
        resolve()
      }
    }
    chrome.tabs.onUpdated.addListener(listener)
  })

  // Give the SPA's JS time to mount before we interact
  await sleep(3000)

  return tab.id
}

// Clean up registry when a tab is closed
chrome.tabs.onRemoved.addListener(tabId => {
  for (const model of ['claude', 'gpt']) {
    if (modelTabs[model] === tabId) modelTabs[model] = null
  }
})

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}
