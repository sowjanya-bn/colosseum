// Injected into the Colosseum app page by the background script.
// Bridges window.postMessage (main world) <-> chrome.runtime (extension).

// Tell the page the extension is here — postMessage crosses the world boundary
window.postMessage({ type: 'COLOSSEUM_BRIDGE_READY' }, '*')

// Page -> extension background
const OUTBOUND = ['COLOSSEUM_SEND', 'COLOSSEUM_SEND_NOWAIT', 'COLOSSEUM_FETCH']
window.addEventListener('message', event => {
  if (event.source !== window) return
  if (!OUTBOUND.includes(event.data?.type)) return
  chrome.runtime.sendMessage(event.data)
})

// Extension background -> page
chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === 'COLOSSEUM_RESPONSE') {
    window.postMessage(msg, '*')
  }
})
