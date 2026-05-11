import { useReducer, useCallback, useState, useEffect, useRef } from 'react'
import { Message, Target } from './types'
import { reducer, INITIAL_STATE, Model } from './state'
import { extensionAvailable, onBridgeReady, sendNowait, fetchFromModel } from './extension'
import { buildPrompt } from './promptBuilder'
import Header, { PanelId } from './components/Header'
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
  const [visiblePanels, setVisiblePanels] = useState<Record<PanelId, boolean>>({
    claude: true, gpt: true, gemini: true,
  })
  const visiblePanelsRef = useRef(visiblePanels)
  useEffect(() => { visiblePanelsRef.current = visiblePanels }, [visiblePanels])

  function togglePanel(panel: PanelId) {
    setVisiblePanels(prev => ({ ...prev, [panel]: !prev[panel] }))
  }

  useEffect(() => {
    return onBridgeReady(() => setBridgeActive(true))
  }, [])

  const { messages, relayDepth, loading, config, clipboardPending, pullReady } = state
  const ALL_MODELS: Model[] = ['claude', 'gpt', 'gemini']

  // Stable refs so callbacks don't need to re-create when state changes
  const messagesRef    = useRef(messages)
  const configRef      = useRef(config)
  const bridgeActiveRef = useRef(bridgeActive)
  useEffect(() => { messagesRef.current = messages },      [messages])
  useEffect(() => { configRef.current = config },          [config])
  useEffect(() => { bridgeActiveRef.current = bridgeActive }, [bridgeActive])

  // Returns true if this content is identical to the last response from that model
  const isDuplicate = useCallback((model: Model, content: string) => {
    const last = [...messagesRef.current].reverse().find(m => m.sender === model)
    return last?.content.trim() === content.trim()
  }, [])
  const isLoading = loading.claude || loading.gpt || loading.gemini
  const hasClipboardPending = !!(clipboardPending.claude || clipboardPending.gpt || clipboardPending.gemini)

  // ── Core respond ───────────────────────────────────────────────────────────
  const respond = useCallback(
    async (targets: Model[], humanMsg: Message) => {
      const modelHasHistory = (model: Model) =>
        messagesRef.current.some(m => m.sender === model)

      if (bridgeActiveRef.current) {
        await Promise.all(targets.map(async (model) => {
          const prompt = buildPrompt(humanMsg.content, model, configRef.current, !modelHasHistory(model))
          try {
            await sendNowait(model, prompt)
            // Pull button stays visible for the whole session once a model is used
            dispatch({ type: 'SET_PULL_READY', model, value: true })
            // Auto-fetch after 10s — user can still pull manually if it's not done
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
            }, 10000)
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
          const prompt = buildPrompt(humanMsg.content, model, configRef.current, !modelHasHistory(model))
          dispatch({
            type: 'SET_CLIPBOARD_PENDING',
            model,
            pending: { prompt, humanMsgId: humanMsg.id },
          })
        })
      }
    },
    [isDuplicate]
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
      const targets: Model[] = target === 'all'
        ? ALL_MODELS.filter(m => visiblePanelsRef.current[m])
        : [target as Model]
      await respond(targets, humanMsg)
    },
    [respond]
  )

  const relayDepthRef = useRef(relayDepth)
  useEffect(() => { relayDepthRef.current = relayDepth }, [relayDepth])

  const handleForward = useCallback(
    async (msg: Message, targets: Model[], note?: string) => {
      dispatch({ type: 'INCREMENT_RELAY' })

      const forwardContent = [
        note ? `[Moderator note]: ${note}` : null,
        `[Forwarded from ${msg.sender}]:\n\n${msg.content}`,
      ].filter(Boolean).join('\n\n')

      const target = targets.length === 1 ? targets[0] : 'all'
      const forwardMsg: Message = {
        id: uid(), timestamp: Date.now(),
        sender: 'human', target,
        content: forwardContent,
        relayDepth: relayDepthRef.current + 1,
        forwardedFrom: msg.sender as Model,
        moderatorNote: note || undefined,
      }
      dispatch({ type: 'ADD_MESSAGE', message: forwardMsg })
      await respond(targets, forwardMsg)
    },
    [respond]
  )

  const handlePull = useCallback(async (model: Model) => {
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
    (model: Model, content: string) => {
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
    if ((!pullReady.claude && !pullReady.gpt && !pullReady.gemini) || !bridgeActive) return
    const interval = setInterval(async () => {
      for (const model of ALL_MODELS) {
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
  }, [pullReady.claude, pullReady.gpt, pullReady.gemini, bridgeActive])

  // ── Panel filtering ────────────────────────────────────────────────────────
  const panelFilter = (panel: Model) => (m: Message) => {
    if (m.sender === panel) return true
    if (m.forwardedFrom === panel) return false  // don't show forward msg in source panel
    return m.target === panel || m.target === 'all'
  }
  const claudeMessages = messages.filter(panelFilter('claude'))
  const gptMessages    = messages.filter(panelFilter('gpt'))
  const geminiMessages = messages.filter(panelFilter('gemini'))

  return (
    <div className="app">
      <Header
        title={config.sessionTitle}
        relayDepth={relayDepth}
        extensionActive={bridgeActive}
        visiblePanels={visiblePanels}
        onTogglePanel={togglePanel}
        onOpenSettings={() => setSettingsOpen(true)}
        onReset={() => dispatch({ type: 'RESET_SESSION' })}
      />

      <Arena
        claudeMessages={claudeMessages}
        gptMessages={gptMessages}
        geminiMessages={geminiMessages}
        loading={loading}
        clipboardPending={clipboardPending}
        pullReady={pullReady}
        visiblePanels={visiblePanels}
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
