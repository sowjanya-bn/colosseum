import { Message, LoadingState } from '../types'
import { ClipboardPending, Model } from '../state'
import { PanelId } from './Header'
import ModelPanel from './ModelPanel'

interface Props {
  claudeMessages:        Message[]
  gptMessages:           Message[]
  geminiMessages:        Message[]
  loading:               LoadingState
  clipboardPending:      { claude?: ClipboardPending; gpt?: ClipboardPending; gemini?: ClipboardPending }
  pullReady:             { claude: boolean; gpt: boolean; gemini: boolean }
  visiblePanels:         Record<PanelId, boolean>
  onForward:             (msg: Message, targets: Model[], note?: string) => void
  onClipboardSubmit:     (model: Model, response: string) => void
  onPull:                (model: Model) => void
}

const PANELS: { id: PanelId; messages: (p: Props) => Message[] }[] = [
  { id: 'claude', messages: p => p.claudeMessages },
  { id: 'gpt',    messages: p => p.gptMessages    },
  { id: 'gemini', messages: p => p.geminiMessages  },
]

export default function Arena(props: Props) {
  const {
    loading, clipboardPending, pullReady, visiblePanels,
    onForward, onClipboardSubmit, onPull,
  } = props

  const visible = PANELS.filter(p => visiblePanels[p.id])
  const cols = visible.map(() => '1fr').join(' 1px ')
  const isEmpty = visible.every(({ id, messages }) =>
    messages(props).length === 0 && !loading[id] && !clipboardPending[id]
  )

  return (
    <div className="arena" style={{ gridTemplateColumns: cols, position: 'relative' }}>
      {isEmpty && (
        <div className="arena-welcome" style={{ gridColumn: `1 / -1` }}>
          <span className="arena-welcome-logo">⚔</span>
          <span className="arena-welcome-line1">Start a session</span>
          <span className="arena-welcome-line2">
            Type a prompt below and send it to Claude, GPT, Gemini, or all three.
            You control every message and every relay.
          </span>
        </div>
      )}

      {visible.map(({ id, messages }, i) => (
        <>
          {i > 0 && <div key={`div-${id}`} className="arena-divider" />}
          <ModelPanel
            key={id}
            model={id}
            messages={messages(props)}
            isLoading={loading[id]}
            clipboardPending={clipboardPending[id]}
            pullReady={pullReady[id]}
            visiblePanels={visiblePanels}
            onForward={onForward}
            onClipboardSubmit={r => onClipboardSubmit(id, r)}
            onPull={() => onPull(id)}
          />
        </>
      ))}
    </div>
  )
}
