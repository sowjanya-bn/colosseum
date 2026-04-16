import { useState, useRef } from 'react'
import { ClipboardPending } from '../state'

interface Props {
  model:    'claude' | 'gpt'
  pending:  ClipboardPending
  onSubmit: (response: string) => void
}

const MODEL_URL: Record<'claude' | 'gpt', string> = {
  claude: 'https://claude.ai',
  gpt:    'https://chatgpt.com',
}

const MODEL_LABEL: Record<'claude' | 'gpt', string> = {
  claude: 'Claude',
  gpt:    'GPT',
}

export default function ClipboardPrompt({ model, pending, onSubmit }: Props) {
  const [copied, setCopied] = useState(false)
  const [response, setResponse] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleCopy() {
    navigator.clipboard.writeText(pending.prompt).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleSubmit() {
    const trimmed = response.trim()
    if (!trimmed) return
    onSubmit(trimmed)
    setResponse('')
  }

  return (
    <div className={`clipboard-prompt clipboard-prompt--${model}`}>
      <div className="clipboard-header">
        <span className="clipboard-step">1</span>
        <span className="clipboard-instruction">
          Copy this prompt → paste into{' '}
          <a href={MODEL_URL[model]} target="_blank" rel="noreferrer" className="clipboard-link">
            {MODEL_LABEL[model]}
          </a>
        </span>
      </div>

      <div className="clipboard-prompt-box">
        <pre className="clipboard-prompt-text">{pending.prompt}</pre>
        <button
          className={`btn-copy ${copied ? 'btn-copy--done' : ''}`}
          onClick={handleCopy}
        >
          {copied ? '✓ copied' : 'copy'}
        </button>
      </div>

      <div className="clipboard-header" style={{ marginTop: 12 }}>
        <span className="clipboard-step">2</span>
        <span className="clipboard-instruction">Paste {MODEL_LABEL[model]}'s response here</span>
      </div>

      <textarea
        ref={textareaRef}
        className="clipboard-paste-area"
        placeholder={`Paste ${MODEL_LABEL[model]}'s response…`}
        value={response}
        onChange={e => setResponse(e.target.value)}
        rows={5}
      />

      <button
        className="btn-submit-response"
        onClick={handleSubmit}
        disabled={!response.trim()}
      >
        Submit response →
      </button>
    </div>
  )
}
