import { Message } from '../types'
import { SessionConfig } from '../state'
import { downloadMarkdown } from '../transcriptExport'

interface Props {
  messages:  Message[]
  config:    SessionConfig
  open:      boolean
  onToggle:  () => void
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const SENDER_LABEL: Record<string, string> = {
  human:  'You',
  claude: 'Claude',
  gpt:    'GPT',
}

const SENDER_COLOR: Record<string, string> = {
  human:  'var(--human)',
  claude: 'var(--claude)',
  gpt:    'var(--gpt)',
}

export default function TranscriptPanel({ messages, config, open, onToggle }: Props) {
  return (
    <div className={`transcript-panel ${open ? 'transcript-panel--open' : ''}`}>
      <div className="transcript-toggle-row">
        <button className="transcript-toggle" onClick={onToggle}>
          <span>Session Transcript</span>
          <span className="transcript-count">{messages.length} entries</span>
          <span className="transcript-chevron">{open ? '▲' : '▼'}</span>
        </button>

        {messages.length > 0 && (
          <button
            className="btn-export"
            onClick={() => downloadMarkdown(messages, config)}
            title="Export transcript as Markdown"
          >
            ↓ export
          </button>
        )}
      </div>

      {open && (
        <div className="transcript-body">
          {messages.length === 0 ? (
            <div className="transcript-empty">No messages yet.</div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className="transcript-entry">
                <span className="transcript-meta">
                  <span style={{ color: SENDER_COLOR[msg.sender] ?? 'inherit' }}>
                    <strong>{SENDER_LABEL[msg.sender] ?? msg.sender}</strong>
                  </span>
                  {' · '}
                  {formatTime(msg.timestamp)}
                  {msg.forwardedFrom && ` · forwarded from ${msg.forwardedFrom}`}
                  {msg.relayDepth > 0 && ` · relay ${msg.relayDepth}`}
                </span>
                <p className="transcript-content">{msg.content}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
