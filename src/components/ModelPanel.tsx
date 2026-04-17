import { useEffect, useRef } from 'react'
import { Message } from '../types'
import { ClipboardPending } from '../state'
import ResponseCard from './ResponseCard'
import ClipboardPrompt from './ClipboardPrompt'

interface Props {
  model:            'claude' | 'gpt'
  messages:         Message[]
  isLoading:        boolean
  clipboardPending: ClipboardPending | undefined
  pullReady:        boolean
  onForward:        (msg: Message, note?: string) => void
  onClipboardSubmit:(response: string) => void
  onPull:           () => void
}

const MODEL_LABEL: Record<'claude' | 'gpt', string> = {
  claude: 'Claude',
  gpt:    'GPT-4o',
}

export default function ModelPanel({
  model,
  messages,
  isLoading,
  clipboardPending,
  pullReady,
  onForward,
  onClipboardSubmit,
  onPull,
}: Props) {
  const feedRef = useRef<HTMLDivElement>(null)
  const responseCount = messages.filter(m => m.sender === model).length

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [messages, isLoading, clipboardPending])

  return (
    <div className={`model-panel model-panel--${model}`}>
      <div className="panel-header">
        <div className="panel-header-left">
          <span className={`panel-dot panel-dot--${model}`} />
          <span className="panel-name">{MODEL_LABEL[model]}</span>
        </div>
        {responseCount > 0 && (
          <span className="panel-count">
            {responseCount} {responseCount === 1 ? 'response' : 'responses'}
          </span>
        )}
        {pullReady && (
          <button className="btn-pull" onClick={onPull} title="Fetch GPT's current response">
            ↓ pull response
          </button>
        )}
      </div>

      <div className="response-feed" ref={feedRef}>
        {messages.length === 0 && !isLoading && !clipboardPending && (
          <div className="feed-empty">Waiting for the first message…</div>
        )}

        {messages.map(msg => (
          <ResponseCard
            key={msg.id}
            message={msg}
            model={model}
            onForward={onForward}
          />
        ))}

        {isLoading && (
          <div className="loading-indicator">
            <span className={`loading-dot loading-dot--${model}`} />
            <span className={`loading-dot loading-dot--${model}`} />
            <span className={`loading-dot loading-dot--${model}`} />
          </div>
        )}

        {clipboardPending && !isLoading && (
          <ClipboardPrompt
            model={model}
            pending={clipboardPending}
            onSubmit={onClipboardSubmit}
          />
        )}
      </div>
    </div>
  )
}
