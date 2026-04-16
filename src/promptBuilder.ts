import { SessionConfig } from './state'

// Builds the full prompt to send to a model tab.
// The context prefix is injected on the FIRST message of a session so the model
// knows its role. Subsequent messages flow naturally in the tab's conversation.
export function buildPrompt(
  content: string,
  model: 'claude' | 'gpt',
  config: SessionConfig,
  isFirstMessage: boolean,
): string {
  if (!isFirstMessage) return content

  const role = model === 'claude' ? config.claudeSystem : config.gptSystem
  const topic = config.sessionTitle.trim() || 'Untitled ideation session'

  return `[Colosseum Ideation Session]
Topic: ${topic}
Your role: ${role}
Note: Your response will be compared with another AI's response by a human moderator. Be direct and substantive. The moderator may forward your response to the other model.

---

${content}`
}
