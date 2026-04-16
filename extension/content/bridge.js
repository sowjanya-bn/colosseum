// Injected into the Colosseum app (localhost).
// Bridges window.postMessage (from the React app) <-> chrome.runtime.sendMessage (to background).

// Signal to the React app that the extension is installed
window.__COLOSSEUM_BRIDGE__ = true

// React app → extension background
window.addEventListener('message', event => {
  if (event.source !== window) return
  if (event.data?.type !== 'COLOSSEUM_SEND') return
  chrome.runtime.sendMessage(event.data)
})

// Extension background → React app
chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === 'COLOSSEUM_RESPONSE') {
    window.postMessage(msg, '*')
  }
})
