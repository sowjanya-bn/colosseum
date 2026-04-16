import { useState } from 'react'
import { Message } from '../types'

interface Props {
  message: Message
  model: 'claude' | 'gpt'
  relayDepth: number
  maxRelayDepth: number
  onForward: (msg: Message, note?: string) => void
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ResponseCard({ message, model, relayDepth, maxRelayDepth, onForward }: Props) {
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState('')

  const isHuman = message.sender === 'human'
  const isModelResponse = message.sender === model
  const canForward = isModelResponse && relayDepth < maxRelayDepth
  const atLimit = relayDepth >= maxRelayDepth

  function handleForward() {
    onForward(message, note.trim() || undefined)
    setNote('')
    setNoteOpen(false)
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
            forwarded from {message.forwardedFrom} · relay {message.relayDepth}/{maxRelayDepth}
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
          forwarded from {message.forwardedFrom} · relay {message.relayDepth}/{maxRelayDepth}
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
            {noteOpen && (
              <div className="forward-note-row">
                <input
                  className="forward-note-input"
                  placeholder="Add a moderator note (optional)…"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleForward()}
                  autoFocus
                />
                <button className="btn-cancel" onClick={() => { setNoteOpen(false); setNote('') }}>
                  cancel
                </button>
              </div>
            )}
            {!noteOpen && (
              <button
                className={`btn-forward ${atLimit ? 'btn-forward--disabled' : ''}`}
                onClick={() => canForward && setNoteOpen(true)}
                disabled={atLimit}
                title={atLimit ? `Relay limit reached (${maxRelayDepth}/${maxRelayDepth})` : `Forward to ${model === 'claude' ? 'GPT' : 'Claude'}`}
              >
                forward →
              </button>
            )}
            {noteOpen && (
              <button className="btn-forward" onClick={handleForward}>
                send →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
