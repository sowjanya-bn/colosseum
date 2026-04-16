// Bridge between the Colosseum React app and the Chrome extension.
// bridge.js signals readiness via window.postMessage (crosses isolated world boundary).

type PendingRequest = { resolve: (v: string) => void; reject: (e: Error) => void }
const pending = new Map<string, PendingRequest>()

let _bridgeReady = false

export function extensionAvailable(): boolean {
  return _bridgeReady
}

export function onBridgeReady(cb: () => void): () => void {
  if (_bridgeReady) { cb(); return () => {} }
  const handler = (event: MessageEvent) => {
    if (event.data?.type === 'COLOSSEUM_BRIDGE_READY') {
      _bridgeReady = true
      cb()
    }
  }
  window.addEventListener('message', handler)
  return () => window.removeEventListener('message', handler)
}

// Listen for responses relayed back from bridge.js
window.addEventListener('message', event => {
  if (event.source !== window) return
  const { type, requestId, content, error } = (event.data ?? {}) as {
    type?: string; requestId?: string; content?: string; error?: string
  }
  if (type !== 'COLOSSEUM_RESPONSE' || !requestId) return

  const p = pending.get(requestId)
  if (!p) return
  pending.delete(requestId)
  if (error) p.reject(new Error(error))
  else p.resolve(content ?? '')
})

export function sendToModel(model: 'claude' | 'gpt', content: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const requestId = Math.random().toString(36).slice(2, 10)
    pending.set(requestId, { resolve, reject })
    window.postMessage({ type: 'COLOSSEUM_SEND', model, content, requestId }, '*')
    setTimeout(() => {
      if (pending.has(requestId)) {
        pending.delete(requestId)
        reject(new Error('No response after 90 seconds — check the model tab'))
      }
    }, 90_000)
  })
}

// Send to a model without waiting for response — returns when prompt is submitted
export function sendNowait(model: 'claude' | 'gpt', content: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const requestId = Math.random().toString(36).slice(2, 10)
    pending.set(requestId, { resolve: () => resolve(), reject })
    window.postMessage({ type: 'COLOSSEUM_SEND_NOWAIT', model, content, requestId }, '*')
    setTimeout(() => {
      if (pending.has(requestId)) {
        pending.delete(requestId)
        reject(new Error(`${model} send timed out`))
      }
    }, 30_000)
  })
}

// Fetch the current last response from a model tab
export function fetchFromModel(model: 'claude' | 'gpt'): Promise<string> {
  return new Promise((resolve, reject) => {
    const requestId = Math.random().toString(36).slice(2, 10)
    pending.set(requestId, { resolve, reject })
    window.postMessage({ type: 'COLOSSEUM_FETCH', model, requestId }, '*')
    setTimeout(() => {
      if (pending.has(requestId)) {
        pending.delete(requestId)
        reject(new Error(`${model} fetch timed out`))
      }
    }, 15_000)
  })
}
