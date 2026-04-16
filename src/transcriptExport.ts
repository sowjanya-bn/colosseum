import { Message } from './types'
import { SessionConfig } from './state'

const LABEL: Record<string, string> = {
  human:  'You (moderator)',
  claude: 'Claude',
  gpt:    'GPT-4o',
}

function formatTime(ts: number): string {
  return new Date(ts).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
}

export function exportMarkdown(messages: Message[], config: SessionConfig): string {
  const title = config.sessionTitle || 'Untitled Session'
  const date = formatTime(Date.now())

  const lines: string[] = [
    `# Colosseum — ${title}`,
    `*Exported ${date}*`,
    '',
    '---',
    '',
  ]

  for (const msg of messages) {
    const sender = LABEL[msg.sender] ?? msg.sender
    const meta: string[] = [`**${sender}**`, formatTime(msg.timestamp)]
    if (msg.relayDepth > 0) meta.push(`relay ${msg.relayDepth}`)
    if (msg.forwardedFrom) meta.push(`forwarded from ${msg.forwardedFrom}`)

    lines.push(`### ${meta.join(' · ')}`)
    if (msg.moderatorNote) {
      lines.push(`> **Moderator note:** ${msg.moderatorNote}`)
      lines.push('')
    }
    lines.push(msg.content)
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  return lines.join('\n')
}

export function downloadMarkdown(messages: Message[], config: SessionConfig): void {
  const md = exportMarkdown(messages, config)
  const blob = new Blob([md], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const slug = (config.sessionTitle || 'colosseum').toLowerCase().replace(/\s+/g, '-').slice(0, 40)
  a.href = url
  a.download = `${slug}-${Date.now()}.md`
  a.click()
  URL.revokeObjectURL(url)
}
