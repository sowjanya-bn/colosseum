import { Message, LoadingState } from '../types'
import { ClipboardPending } from '../state'
import ModelPanel from './ModelPanel'

interface Props {
  claudeMessages:        Message[]
  gptMessages:           Message[]
  loading:               LoadingState
  clipboardPending:      { claude?: ClipboardPending; gpt?: ClipboardPending }
  pullReady:             { claude: boolean; gpt: boolean }
  relayDepth:            number
  onForward:             (msg: Message, note?: string) => void
  onClipboardSubmit:     (model: 'claude' | 'gpt', response: string) => void
  onPull:                (model: 'claude' | 'gpt') => void
}

export default function Arena({
  claudeMessages,
  gptMessages,
  loading,
  clipboardPending,
  pullReady,
  relayDepth,
  onForward,
  onClipboardSubmit,
  onPull,
}: Props) {
  const isEmpty = claudeMessages.length === 0 && gptMessages.length === 0
    && !loading.claude && !loading.gpt
    && !clipboardPending.claude && !clipboardPending.gpt

  return (
    <div className="arena" style={{ position: 'relative' }}>
      {isEmpty && (
        <div className="arena-welcome">
          <span className="arena-welcome-logo">⚔</span>
          <span className="arena-welcome-line1">Start a session</span>
          <span className="arena-welcome-line2">
            Type a prompt below and send it to Claude, GPT, or both.
            You control every message and every relay.
          </span>
        </div>
      )}

      <ModelPanel
        model="claude"
        messages={claudeMessages}
        isLoading={loading.claude}
        clipboardPending={clipboardPending.claude}
        pullReady={pullReady.claude}
        relayDepth={relayDepth}
        onForward={onForward}
        onClipboardSubmit={r => onClipboardSubmit('claude', r)}
        onPull={() => onPull('claude')}
      />
      <div className="arena-divider" />
      <ModelPanel
        model="gpt"
        messages={gptMessages}
        isLoading={loading.gpt}
        clipboardPending={clipboardPending.gpt}
        pullReady={pullReady.gpt}
        relayDepth={relayDepth}
        onForward={onForward}
        onClipboardSubmit={r => onClipboardSubmit('gpt', r)}
        onPull={() => onPull('gpt')}
      />
    </div>
  )
}
