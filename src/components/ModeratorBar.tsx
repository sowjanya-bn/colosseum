import { useState, useRef, useEffect } from 'react'
import { Target } from '../types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySpeechRecognition = any

interface Props {
  onSend: (content: string, target: Target, note?: string) => void
  disabled: boolean
  autoPlay: boolean
  onToggleAutoPlay: () => void
}

const TARGETS: { value: Target; label: string }[] = [
  { value: 'claude', label: 'Claude' },
  { value: 'gpt',    label: 'GPT' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'all',    label: 'All' },
]

export default function ModeratorBar({ onSend, disabled, autoPlay, onToggleAutoPlay }: Props) {
  const [target, setTarget] = useState<Target>('all')
  const [message, setMessage] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState('')
  const [listening, setListening] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<AnySpeechRecognition>(null)

  useEffect(() => {
    return () => { recognitionRef.current?.abort() }
  }, [])

  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    const rec = new SpeechRecognition()
    rec.continuous = true
    rec.interimResults = false
    rec.lang = 'en-US'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transcript = Array.from(e.results as any[])
        .slice(e.resultIndex)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((r: any) => r.isFinal)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r[0].transcript)
        .join(' ')
      if (transcript) setMessage(prev => prev ? prev + ' ' + transcript : transcript)
    }

    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)

    recognitionRef.current = rec
    rec.start()
    setListening(true)
  }

  function handleSend() {
    const trimmed = message.trim()
    if (!trimmed || disabled) return
    onSend(trimmed, target, note.trim() || undefined)
    setMessage('')
    setNote('')
    setNoteOpen(false)
    textareaRef.current?.focus()
  }

  function handleContext() {
    const trimmed = message.trim()
    if (!trimmed || disabled) return
    onSend(`[Context only — do not respond, just acknowledge with "understood"]\n\n${trimmed}`, target, note.trim() || undefined)
    setMessage('')
    setNote('')
    setNoteOpen(false)
    textareaRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
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

          <div className="input-with-mic">
            <textarea
              ref={textareaRef}
              className="message-input"
              placeholder="Type a prompt… (Enter to send, Shift+Enter for newline)"
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              rows={3}
            />
            <button
              className={`btn-mic ${listening ? 'btn-mic--active' : ''}`}
              onClick={toggleVoice}
              disabled={disabled}
              title={listening ? 'Stop recording' : 'Dictate'}
              type="button"
            >
              {listening ? '⏹' : '🎙'}
            </button>
          </div>

          <div className="bar-controls">
            <button
              className={`btn-autoplay ${autoPlay ? 'btn-autoplay--active' : ''}`}
              onClick={onToggleAutoPlay}
              title={autoPlay ? 'Auto-play on — models relay automatically (click to stop)' : 'Auto-play off — you forward manually'}
            >
              auto
            </button>
            <button
              className={`btn-note-toggle ${noteOpen ? 'btn-note-toggle--active' : ''}`}
              onClick={() => setNoteOpen(o => !o)}
              disabled={disabled}
              title="Add moderator note"
            >
              note
            </button>
            <button
              className="btn-context"
              onClick={handleContext}
              disabled={disabled || !message.trim()}
              title="Send as context only — models acknowledge but don't respond"
            >
              + context
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
