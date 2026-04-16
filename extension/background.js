// ── Tab registry ─────────────────────────────────────────────────────────────
// Tab IDs are persisted in chrome.storage.session so they survive service worker
// restarts (which happen after ~30s of inactivity in MV3).

const NEW_URLS = {
  claude: 'https://claude.ai/new',
  gpt:    'https://chatgpt.com/',
}

const MATCH_URLS = {
  claude: 'https://claude.ai/*',
  gpt:    'https://chatgpt.com/*',
}

async function getTabId(model) {
  const { modelTabs = {} } = await chrome.storage.session.get('modelTabs')
  return modelTabs[model] ?? null
}

async function setTabId(model, tabId) {
  const { modelTabs = {} } = await chrome.storage.session.get('modelTabs')
  modelTabs[model] = tabId
  await chrome.storage.session.set({ modelTabs })
}

async function clearTabId(model) {
  await setTabId(model, null)
}

// ── Pending requests ──────────────────────────────────────────────────────────
// requestId -> { colosseumTabId }
const pending = {}

// ── Message routing ───────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender) => {
  const colosseumTabId = sender.tab?.id
  if      (msg.type === 'COLOSSEUM_SEND')       handleSend(msg, colosseumTabId)
  else if (msg.type === 'COLOSSEUM_SEND_NOWAIT') handleSendNowait(msg, colosseumTabId)
  else if (msg.type === 'COLOSSEUM_FETCH')       handleFetch(msg, colosseumTabId)
  else if (msg.type === 'PROMPT_RESPONSE')       handleResponse(msg)
  else if (msg.type === 'SEND_ACK')              handleSendAck(msg)
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

async function handleSendNowait({ model, content, requestId }, colosseumTabId) {
  try {
    const tabId = await ensureTab(model)
    pending[requestId] = { colosseumTabId }
    await chrome.tabs.sendMessage(tabId, { type: 'SEND_PROMPT_NOWAIT', content, requestId })
  } catch (err) {
    replyToColosseum(colosseumTabId, requestId, null, err.message)
  }
}

async function handleFetch({ model, requestId }, colosseumTabId) {
  try {
    const tabId = await ensureTab(model)
    pending[requestId] = { colosseumTabId }
    await chrome.tabs.sendMessage(tabId, { type: 'FETCH_RESPONSE', requestId })
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

function handleSendAck({ requestId }) {
  const p = pending[requestId]
  if (!p) return
  delete pending[requestId]
  chrome.tabs.sendMessage(p.colosseumTabId, {
    type: 'COLOSSEUM_RESPONSE', requestId, content: '',
  }).catch(() => {})
}

function replyToColosseum(tabId, requestId, content, error) {
  chrome.tabs.sendMessage(tabId, { type: 'COLOSSEUM_RESPONSE', requestId, content, error })
    .catch(() => {})
}

// ── Tab management ────────────────────────────────────────────────────────────
const CONTENT_SCRIPTS = {
  claude: 'content/claude.js',
  gpt:    'content/gpt.js',
}

async function ensureTab(model) {
  let tabId = null

  // Check persisted tab ID
  const storedId = await getTabId(model)
  if (storedId != null) {
    try {
      await chrome.tabs.get(storedId)
      tabId = storedId
    } catch {
      await clearTabId(model)
    }
  }

  // Find an existing matching tab
  if (tabId == null) {
    const [existing] = await chrome.tabs.query({ url: MATCH_URLS[model] })
    if (existing) {
      tabId = existing.id
      await setTabId(model, tabId)
    }
  }

  // Open fresh tab in background
  if (tabId == null) {
    const tab = await chrome.tabs.create({ url: NEW_URLS[model], active: false })
    tabId = tab.id
    await setTabId(model, tabId)

    await new Promise(resolve => {
      function listener(id, info) {
        if (id === tabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener)
          resolve()
        }
      }
      chrome.tabs.onUpdated.addListener(listener)
    })

    await sleep(2000)
  }

  // Always inject the content script — guard inside the script prevents double-init
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files:  [CONTENT_SCRIPTS[model]],
    })
  } catch { /* already injected or tab not ready */ }

  await sleep(300)
  return tabId
}

// Clear registry when a model tab is closed
chrome.tabs.onRemoved.addListener(async tabId => {
  const { modelTabs = {} } = await chrome.storage.session.get('modelTabs')
  let changed = false
  for (const model of ['claude', 'gpt']) {
    if (modelTabs[model] === tabId) { modelTabs[model] = null; changed = true }
  }
  if (changed) await chrome.storage.session.set({ modelTabs })
})

// ── Bridge injection ──────────────────────────────────────────────────────────
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return
  if (!tab.url?.startsWith('http://localhost')) return
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content/bridge.js'] })
  } catch { /* not injectable */ }
})

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}
