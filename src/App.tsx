import { useReducer, useCallback, useState } from 'react'
import { Message, Target } from './types'
import { reducer, INITIAL_STATE } from './state'
import { getMockResponse } from './mockData'
import { extensionAvailable, sendToModel } from './extension'
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

  const { messages, relayDepth, loading, config } = state
  const isLoading = loading.claude || loading.gpt

  // ── Core send / respond ────────────────────────────────────────────────────
  const respond = useCallback(
    async (targets: ('claude' | 'gpt')[], humanMsg: Message) => {
      const usingExtension = extensionAvailable()
      // A message counts as "first" for a model if none of its responses exist yet
      const modelHasHistory = (model: 'claude' | 'gpt') =>
        messages.some(m => m.sender === model)

      await Promise.all(
        targets.map(async (model) => {
          dispatch({ type: 'SET_LOADING', model, value: true })

          let content: string
          let source: 'live' | 'mock' = usingExtension ? 'live' : 'mock'
          try {
            const isFirst = !modelHasHistory(model)
            const prompt = buildPrompt(humanMsg.content, model, config, isFirst)

            if (usingExtension) {
              content = await sendToModel(model, prompt)
            } else {
              await new Promise(r => setTimeout(r, 800 + Math.random() * 600))
              content = getMockResponse(model)
            }
          } catch (err) {
            content = `[Error: ${err instanceof Error ? err.message : String(err)}]`
            source = 'mock'
          }

          dispatch({
            type: 'ADD_MESSAGE',
            message: {
              id: uid(),
              timestamp: Date.now(),
              sender: model,
              target: model,
              content,
              relayDepth: humanMsg.relayDepth,
              forwardedFrom: humanMsg.forwardedFrom,
              source,
            },
          })
          dispatch({ type: 'SET_LOADING', model, value: false })
        })
      )
    },
    [messages, config]
  )

  const handleSend = useCallback(
    async (content: string, target: Target, note?: string) => {
      const humanMsg: Message = {
        id: uid(),
        timestamp: Date.now(),
        sender: 'human',
        target,
        content,
        relayDepth: 0,
        moderatorNote: note || undefined,
      }
      dispatch({ type: 'ADD_MESSAGE', message: humanMsg })

      const targets: ('claude' | 'gpt')[] =
        target === 'both' ? ['claude', 'gpt'] : [target]
      await respond(targets, humanMsg)
    },
    [respond]
  )

  const handleForward = useCallback(
    async (msg: Message, note?: string) => {
      if (relayDepth >= config.maxRelayDepth) return

      const toModel: 'claude' | 'gpt' = msg.sender === 'claude' ? 'gpt' : 'claude'
      dispatch({ type: 'INCREMENT_RELAY' })

      const forwardContent = [
        note ? `[Moderator note]: ${note}` : null,
        `[Forwarded from ${msg.sender}]:\n\n${msg.content}`,
      ]
        .filter(Boolean)
        .join('\n\n')

      const forwardMsg: Message = {
        id: uid(),
        timestamp: Date.now(),
        sender: 'human',
        target: toModel,
        content: forwardContent,
        relayDepth: relayDepth + 1,
        forwardedFrom: msg.sender as 'claude' | 'gpt',
        moderatorNote: note || undefined,
      }
      dispatch({ type: 'ADD_MESSAGE', message: forwardMsg })
      await respond([toModel], forwardMsg)
    },
    [relayDepth, config.maxRelayDepth, respond]
  )

  // ── Panel message filtering ────────────────────────────────────────────────
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
        maxRelayDepth={config.maxRelayDepth}
        extensionActive={extensionAvailable()}
        onOpenSettings={() => setSettingsOpen(true)}
        onReset={() => dispatch({ type: 'RESET_SESSION' })}
      />

      <Arena
        claudeMessages={claudeMessages}
        gptMessages={gptMessages}
        loading={loading}
        relayDepth={relayDepth}
        maxRelayDepth={config.maxRelayDepth}
        onForward={handleForward}
      />

      <ModeratorBar
        onSend={handleSend}
        disabled={isLoading}
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
