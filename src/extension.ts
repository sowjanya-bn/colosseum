// Bridge between the Colosseum React app and the Chrome extension.
// The extension injects bridge.js into this page, which sets window.__COLOSSEUM_BRIDGE__
// and relays postMessages to/from the background service worker.

type PendingRequest = { resolve: (v: string) => void; reject: (e: Error) => void }
const pending = new Map<string, PendingRequest>()

// Listen once for all COLOSSEUM_RESPONSE messages from the extension bridge
window.addEventListener('message', event => {
  if (event.source !== window) return
  const { type, requestId, content, error } = (event.data ?? {}) as {
    type?: string
    requestId?: string
    content?: string
    error?: string
  }
  if (type !== 'COLOSSEUM_RESPONSE' || !requestId) return

  const p = pending.get(requestId)
  if (!p) return
  pending.delete(requestId)

  if (error) p.reject(new Error(error))
  else p.resolve(content ?? '')
})

export function extensionAvailable(): boolean {
  return !!(window as unknown as Record<string, unknown>)['__COLOSSEUM_BRIDGE__']
}

export function sendToModel(model: 'claude' | 'gpt', content: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const requestId = Math.random().toString(36).slice(2, 10)
    pending.set(requestId, { resolve, reject })

    window.postMessage({ type: 'COLOSSEUM_SEND', model, content, requestId }, '*')

    // Hard timeout — if a model tab hangs or the extension stops responding
    setTimeout(() => {
      if (pending.has(requestId)) {
        pending.delete(requestId)
        reject(new Error('No response after 90 seconds — check the model tab'))
      }
    }, 90_000)
  })
}
