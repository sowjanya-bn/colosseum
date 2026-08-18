// Injected into the Colosseum app page by the background script.
// Bridges window.postMessage (main world) <-> chrome.runtime (extension).
;(function () {
  // Remove any previously injected bridge so we always use the current extension context.
  if (window.__COLOSSEUM_BRIDGE__) {
    window.__COLOSSEUM_BRIDGE__.cleanup()
  }

  const OUTBOUND = ['COLOSSEUM_SEND', 'COLOSSEUM_SEND_NOWAIT', 'COLOSSEUM_FETCH']

  function onPageMessage(event) {
    if (event.source !== window) return
    if (!OUTBOUND.includes(event.data?.type)) return
    try { chrome.runtime.sendMessage(event.data) } catch { /* context invalidated */ }
  }

  function onExtMessage(msg) {
    if (msg.type === 'COLOSSEUM_RESPONSE') {
      window.postMessage(msg, '*')
    }
  }

  window.addEventListener('message', onPageMessage)
  chrome.runtime.onMessage.addListener(onExtMessage)

  window.__COLOSSEUM_BRIDGE__ = {
    cleanup() {
      window.removeEventListener('message', onPageMessage)
      try { chrome.runtime.onMessage.removeListener(onExtMessage) } catch { /* already gone */ }
    }
  }

  // Tell the page the extension is here
  window.postMessage({ type: 'COLOSSEUM_BRIDGE_READY' }, '*')
})()
