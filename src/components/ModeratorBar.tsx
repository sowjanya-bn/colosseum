import { useState, useRef } from 'react'
import { Target } from '../types'

interface Props {
  onSend: (content: string, target: Target, note?: string) => void
  disabled: boolean
}

const TARGETS: { value: Target; label: string }[] = [
  { value: 'claude', label: 'Claude' },
  { value: 'gpt', label: 'GPT' },
  { value: 'both', label: 'Both' },
]

export default function ModeratorBar({ onSend, disabled }: Props) {
  const [target, setTarget] = useState<Target>('both')
  const [message, setMessage] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleSend() {
    const trimmed = message.trim()
    if (!trimmed || disabled) return
    onSend(trimmed, target, note.trim() || undefined)
    setMessage('')
    setNote('')
    setNoteOpen(false)
    textareaRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSend()
    }
  }

  return (
    <div className="moderator-bar">
      <div className="moderator-bar-inner">
        {noteOpen && (
          <div className="mod-note-row">
            <span className="mod-note-label">moderator note</span>
            <input
              className="mod-note-input"
              placeholder="Context or framing to prepend…"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
            <button className="btn-note-close" onClick={() => { setNoteOpen(false); setNote('') }}>
              ✕
            </button>
          </div>
        )}

        <div className="bar-main-row">
          <div className="target-selector">
            {TARGETS.map(t => (
              <button
                key={t.value}
                className={`target-btn target-btn--${t.value} ${target === t.value ? 'target-btn--active' : ''}`}
                onClick={() => setTarget(t.value)}
                disabled={disabled}
              >
                {t.label}
              </button>
            ))}
          </div>

          <textarea
            ref={textareaRef}
            className="message-input"
            placeholder="Type a prompt… (⌘↵ to send)"
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            rows={3}
          />

          <div className="bar-controls">
            <button
              className={`btn-note-toggle ${noteOpen ? 'btn-note-toggle--active' : ''}`}
              onClick={() => setNoteOpen(o => !o)}
              disabled={disabled}
              title="Add moderator note"
            >
              note
            </button>
            <button
              className="btn-send"
              onClick={handleSend}
              disabled={disabled || !message.trim()}
            >
              {disabled ? 'thinking…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
