import { useState } from 'react'
import { Message } from '../types'
import { Model } from '../state'

const ALL_MODELS: Model[] = ['claude', 'gpt', 'gemini']
const MODEL_LABEL: Record<Model, string> = { claude: 'Claude', gpt: 'GPT', gemini: 'Gemini' }

interface Props {
  message:       Message
  model:         Model
  visiblePanels: Record<Model, boolean>
  onForward:     (msg: Message, targets: Model[], note?: string) => void
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ResponseCard({ message, model, visiblePanels, onForward }: Props) {
  const otherModels = ALL_MODELS.filter(m => m !== model && visiblePanels[m])

  const [forwarding, setForwarding] = useState(false)
  const [note, setNote]             = useState('')
  const [targets, setTargets]       = useState<Model[]>([])

  const isHuman         = message.sender === 'human'
  const isModelResponse = message.sender === model

  function openForward() {
    // auto-select if only one other visible model
    setTargets(otherModels.length === 1 ? [otherModels[0]] : [])
    setForwarding(true)
  }

  function toggleTarget(m: Model) {
    setTargets(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
  }

  function handleSend() {
    if (!targets.length) return
    onForward(message, targets, note.trim() || undefined)
    setNote('')
    setTargets([])
    setForwarding(false)
  }

  function handleCancel() {
    setForwarding(false)
    setNote('')
    setTargets([])
  }

  if (isHuman) {
    return (
      <div className="card card--human">
        {message.moderatorNote && (
          <div className="card-mod-note">
            <span className="card-mod-note-label">moderator note</span>
            {message.moderatorNote}
          </div>
        )}
        {message.forwardedFrom && (
          <div className="card-forwarded-label">
            forwarded from {message.forwardedFrom} · relay {message.relayDepth}
          </div>
        )}
        <div className="card-content">{message.content}</div>
        <div className="card-meta">{formatTime(message.timestamp)}</div>
      </div>
    )
  }

  const isError = message.content.startsWith('[Error:')

  return (
    <div className={`card card--${message.sender} ${isError ? 'card--error' : ''}`}>
      {message.forwardedFrom && (
        <div className="card-forwarded-label">
          forwarded from {message.forwardedFrom} · relay {message.relayDepth}
        </div>
      )}
      <div className="card-content">{message.content}</div>
      <div className="card-footer">
        <div className="card-meta-row">
          <span className="card-meta">{formatTime(message.timestamp)}</span>
          {message.source && (
            <span className={`source-tag source-tag--${message.source}`}>
              {message.source === 'live' ? '● live' : '○ mock'}
            </span>
          )}
        </div>

        {isModelResponse && (
          <div className="card-actions">
            {!forwarding && (
              <button className="btn-forward" onClick={openForward}>
                forward →
              </button>
            )}

            {forwarding && (
              <div className="forward-panel">
                {otherModels.length > 1 && (
                  <div className="forward-target-row">
                    {otherModels.map(m => (
                      <button
                        key={m}
                        className={`forward-target-btn forward-target-btn--${m} ${targets.includes(m) ? 'forward-target-btn--active' : ''}`}
                        onClick={() => toggleTarget(m)}
                      >
                        {MODEL_LABEL[m]}
                      </button>
                    ))}
                  </div>
                )}
                <input
                  className="forward-note-input"
                  placeholder="Moderator note (optional)…"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  autoFocus
                />
                <div className="forward-action-row">
                  <button className="btn-cancel" onClick={handleCancel}>cancel</button>
                  <button
                    className="btn-forward"
                    onClick={handleSend}
                    disabled={targets.length === 0}
                  >
                    send →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
