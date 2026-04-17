import { useReducer, useCallback, useState, useEffect, useRef } from 'react'
import { Message, Target } from './types'
import { reducer, INITIAL_STATE } from './state'
import { extensionAvailable, onBridgeReady, sendNowait, fetchFromModel } from './extension'
import { buildPrompt } from './promptBuilder'
import Header from './components/Header'
import Arena from './components/Arena'
import ModeratorBar from './components/ModeratorBar'
import TranscriptPanel from './components/TranscriptPanel'
import SettingsDrawer from './components/SettingsDrawer'

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [bridgeActive, setBridgeActive] = useState(extensionAvailable())

  useEffect(() => {
    return onBridgeReady(() => setBridgeActive(true))
  }, [])

  const { messages, relayDepth, loading, config, clipboardPending, pullReady } = state

  // Returns true if this content is identical to the last response from that model
  const isDuplicate = useCallback((model: 'claude' | 'gpt', content: string) => {
    const last = [...messages].reverse().find(m => m.sender === model)
    return last?.content.trim() === content.trim()
  }, [messages])
  const isLoading = loading.claude || loading.gpt
  const hasClipboardPending = !!(clipboardPending.claude || clipboardPending.gpt)

  // ── Core respond ───────────────────────────────────────────────────────────
  const respond = useCallback(
    async (targets: ('claude' | 'gpt')[], humanMsg: Message) => {
      const modelHasHistory = (model: 'claude' | 'gpt') =>
        messages.some(m => m.sender === model)

      if (bridgeActive) {
        await Promise.all(targets.map(async (model) => {
          const prompt = buildPrompt(humanMsg.content, model, config, !modelHasHistory(model))
          try {
            await sendNowait(model, prompt)
            // Pull button stays visible for the whole session once a model is used
            dispatch({ type: 'SET_PULL_READY', model, value: true })
            // Auto-fetch after 6s — user can still pull manually if it's not done
            setTimeout(async () => {
              try {
                const content = await fetchFromModel(model)
                if (content && !isDuplicate(model, content)) {
                  dispatch({
                    type: 'ADD_MESSAGE',
                    message: {
                      id: uid(), timestamp: Date.now(),
                      sender: model, target: model, content,
                      relayDepth: humanMsg.relayDepth,
                      forwardedFrom: humanMsg.forwardedFrom,
                      source: 'live',
                    },
                  })
                }
              } catch { /* auto-fetch failed — pull button is still there */ }
            }, 6000)
          } catch (err) {
            dispatch({
              type: 'ADD_MESSAGE',
              message: {
                id: uid(), timestamp: Date.now(),
                sender: model, target: model,
                content: `[Error: ${err instanceof Error ? err.message : String(err)}]`,
                relayDepth: humanMsg.relayDepth,
                source: 'live',
              },
            })
          }
        }))
      } else {
        // Clipboard mode: generate formatted prompts, wait for user to paste back
        targets.forEach(model => {
          const prompt = buildPrompt(humanMsg.content, model, config, !modelHasHistory(model))
          dispatch({
            type: 'SET_CLIPBOARD_PENDING',
            model,
            pending: { prompt, humanMsgId: humanMsg.id },
          })
        })
      }
    },
    [messages, config, bridgeActive]
  )

  const handleSend = useCallback(
    async (content: string, target: Target, note?: string) => {
      // Each fresh send starts a new relay chain
      dispatch({ type: 'RESET_RELAY' })
      const humanMsg: Message = {
        id: uid(), timestamp: Date.now(),
        sender: 'human', target, content,
        relayDepth: 0,
        moderatorNote: note || undefined,
      }
      dispatch({ type: 'ADD_MESSAGE', message: humanMsg })
      const targets: ('claude' | 'gpt')[] = target === 'both' ? ['claude', 'gpt'] : [target]
      await respond(targets, humanMsg)
    },
    [respond]
  )

  const handleForward = useCallback(
    async (msg: Message, note?: string) => {
      const toModel: 'claude' | 'gpt' = msg.sender === 'claude' ? 'gpt' : 'claude'
      dispatch({ type: 'INCREMENT_RELAY' })

      const forwardContent = [
        note ? `[Moderator note]: ${note}` : null,
        `[Forwarded from ${msg.sender}]:\n\n${msg.content}`,
      ].filter(Boolean).join('\n\n')

      const forwardMsg: Message = {
        id: uid(), timestamp: Date.now(),
        sender: 'human', target: toModel,
        content: forwardContent,
        relayDepth: relayDepth + 1,
        forwardedFrom: msg.sender as 'claude' | 'gpt',
        moderatorNote: note || undefined,
      }
      dispatch({ type: 'ADD_MESSAGE', message: forwardMsg })
      await respond([toModel], forwardMsg)
    },
    [relayDepth, respond]
  )

  const handlePull = useCallback(async (model: 'claude' | 'gpt') => {
    dispatch({ type: 'SET_LOADING', model, value: true })
    try {
      const content = await fetchFromModel(model)
      if (content && !isDuplicate(model, content)) {
        dispatch({
          type: 'ADD_MESSAGE',
          message: {
            id: uid(), timestamp: Date.now(),
            sender: model, target: model, content,
            relayDepth: 0,
            source: 'live',
          },
        })
      }
    } catch (err) {
      dispatch({
        type: 'ADD_MESSAGE',
        message: {
          id: uid(), timestamp: Date.now(),
          sender: model, target: model,
          content: `[Error: ${err instanceof Error ? err.message : String(err)}]`,
          relayDepth: 0,
          source: 'live',
        },
      })
    }
    dispatch({ type: 'SET_LOADING', model, value: false })
  }, [isDuplicate])

  // Called when user pastes a response back in clipboard mode
  const handleClipboardSubmit = useCallback(
    (model: 'claude' | 'gpt', content: string) => {
      dispatch({ type: 'CLEAR_CLIPBOARD', model })
      dispatch({
        type: 'ADD_MESSAGE',
        message: {
          id: uid(), timestamp: Date.now(),
          sender: model, target: model,
          content,
          relayDepth: 0,
          source: 'live',
        },
      })
    },
    []
  )

  // ── Proactive pull ─────────────────────────────────────────────────────────
  // Retry fetching every 60s while a request is outstanding (handles background tab throttling)
  const isDuplicateRef = useRef(isDuplicate)
  const loadingRef = useRef(loading)
  useEffect(() => { isDuplicateRef.current = isDuplicate }, [isDuplicate])
  useEffect(() => { loadingRef.current = loading }, [loading])

  useEffect(() => {
    if ((!pullReady.claude && !pullReady.gpt) || !bridgeActive) return
    const interval = setInterval(async () => {
      for (const model of ['claude', 'gpt'] as const) {
        if (!pullReady[model] || loadingRef.current[model]) continue
        try {
          const content = await fetchFromModel(model)
          if (content && !isDuplicateRef.current(model, content)) {
            dispatch({
              type: 'ADD_MESSAGE',
              message: {
                id: uid(), timestamp: Date.now(),
                sender: model, target: model, content,
                relayDepth: 0,
                source: 'live',
              },
            })
          }
        } catch { /* silent — pull button still available */ }
      }
    }, 60_000)
    return () => clearInterval(interval)
  }, [pullReady.claude, pullReady.gpt, bridgeActive])

  // ── Panel filtering ────────────────────────────────────────────────────────
  const claudeMessages = messages.filter(
    m => m.target === 'claude' || m.target === 'both' || m.sender === 'claude'
  )
  const gptMessages = messages.filter(
    m => m.target === 'gpt' || m.target === 'both' || m.sender === 'gpt'
  )

  return (
    <div className="app">
      <Header
        title={config.sessionTitle}
        relayDepth={relayDepth}
        extensionActive={bridgeActive}
        onOpenSettings={() => setSettingsOpen(true)}
        onReset={() => dispatch({ type: 'RESET_SESSION' })}
      />

      <Arena
        claudeMessages={claudeMessages}
        gptMessages={gptMessages}
        loading={loading}
        clipboardPending={clipboardPending}
        pullReady={pullReady}
        onForward={handleForward}
        onClipboardSubmit={handleClipboardSubmit}
        onPull={handlePull}
      />

      <ModeratorBar
        onSend={handleSend}
        disabled={isLoading || hasClipboardPending}
      />

      <TranscriptPanel
        messages={messages}
        config={config}
        open={transcriptOpen}
        onToggle={() => setTranscriptOpen(o => !o)}
      />

      {settingsOpen && (
        <SettingsDrawer
          config={config}
          onUpdate={patch => dispatch({ type: 'UPDATE_CONFIG', patch })}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}
