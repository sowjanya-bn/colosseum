import { SessionConfig } from './state'

// Builds the prompt to send to a model tab.
// On the first message, a brief context line is prepended so the model knows its role.
// Subsequent messages flow naturally in the tab's conversation.
export function buildPrompt(
  content: string,
  model: 'claude' | 'gpt',
  config: SessionConfig,
  isFirstMessage: boolean,
): string {
  if (!isFirstMessage) return content

  const brevity = 'Keep your response to plain text, 2–3 paragraphs max. No bullet lists, no headers, no markdown.'

  if (model === 'gpt') {
    const topic = config.sessionTitle.trim()
    return topic
      ? `We're discussing: ${topic}\n\n${brevity}\n\n${content}`
      : `${brevity}\n\n${content}`
  }

  // Claude gets the fuller framing
  const role = config.claudeSystem
  const topic = config.sessionTitle.trim() || 'an open ideation session'

  return `[Colosseum — ${topic}]
Your role: ${role}
Note: Your response may be forwarded to another model by the human moderator. Be direct and substantive.
${brevity}

---

${content}`
}
