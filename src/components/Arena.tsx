import { Message, LoadingState } from '../types'
import ModelPanel from './ModelPanel'

interface Props {
  claudeMessages: Message[]
  gptMessages:    Message[]
  loading:        LoadingState
  relayDepth:     number
  maxRelayDepth:  number
  onForward:      (msg: Message, note?: string) => void
}

export default function Arena({
  claudeMessages,
  gptMessages,
  loading,
  relayDepth,
  maxRelayDepth,
  onForward,
}: Props) {
  const isEmpty = claudeMessages.length === 0 && gptMessages.length === 0
    && !loading.claude && !loading.gpt

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
        relayDepth={relayDepth}
        maxRelayDepth={maxRelayDepth}
        onForward={onForward}
      />
      <div className="arena-divider" />
      <ModelPanel
        model="gpt"
        messages={gptMessages}
        isLoading={loading.gpt}
        relayDepth={relayDepth}
        maxRelayDepth={maxRelayDepth}
        onForward={onForward}
      />
    </div>
  )
}
