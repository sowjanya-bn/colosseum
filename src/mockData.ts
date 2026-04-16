// Pools of mock responses for Claude and GPT.
// Each send/forward picks a random one so the UI feels alive during Phase 1.

export const CLAUDE_RESPONSES = [
  `There's an interesting tension here between the desire for structure and the need for emergence. The framing assumes these are opposites — but what if the structure is what *enables* emergence rather than constraining it?

The relay mechanic itself is a good example: by limiting depth to three turns, you're not reducing the conversation — you're forcing a kind of crystallization at each stage. The constraint is the design.

What's the underlying question you're actually trying to answer?`,

  `I keep returning to the word "lightweight." It's doing a lot of work in this framing. Lightweight compared to what — a full agent system? A human workshop? The comparison changes what you should optimize for.

If the goal is to surface *contrast* between two models, then the interface should make disagreement legible, not just visible. Right now the side-by-side layout shows you two outputs. But it doesn't yet help you see *where* they diverge and *why* that might matter.

That's the interesting design problem.`,

  `The relay depth cap is the most defensible decision in the whole spec. Here's why: models don't accumulate understanding the way humans do across a conversation — they accumulate *position*. After two turns of a relay, both models have each other's framing in their context and will start converging. The cap prevents false consensus.

Three turns is probably right. You could even argue two is enough for most ideation purposes.`,

  `What you've described is essentially a structured dissensus machine. The value isn't the outputs — it's the *gap* between them. That gap is information. It tells you where the question is genuinely ambiguous, where reasonable intelligent systems land in different places.

The moderator's job is to notice that gap and decide whether to collapse it or preserve it. That's not a technical problem. That's judgment.`,

  `I want to push back gently on the "thinking tool" framing. Tools are passive — they wait to be used. What you're describing is more like a *practice*: a structured way of engaging with uncertainty that, done repeatedly, trains a certain kind of thinking.

The distinction matters for how you'd evaluate success. A tool succeeds if it works. A practice succeeds if it changes how you think.`,
]

export const GPT_RESPONSES = [
  `A few concrete things worth resolving before the next phase:

1. **Relay initialization**: When a user forwards to the other model, does the full prior conversation go with it, or just the forwarded message? This affects context length and also whether the receiving model has "opinions" about earlier exchanges it didn't participate in.

2. **Paste-back validation**: In clipboard mode, there's no guarantee the user pastes back a real response. You should handle empty or malformed paste-backs gracefully — either a clear error state or a neutral placeholder.

3. **Transcript export format**: Markdown is the obvious choice but decide now whether timestamps are relative ("3 min ago") or absolute (ISO 8601). Once users have transcripts in the wild, changing the format is a breaking change.

These are all solvable. Just worth deciding explicitly.`,

  `The side-by-side layout is correct for the use case, but there are some edge cases to handle:

- **Long responses**: If one model produces 800 words and the other produces 200, the panels will be very unbalanced. Consider whether you want equal-height panels (with scroll) or natural height.
- **Multiple exchanges**: After 4-5 rounds, the ResponseFeed scrolls and the most recent response is no longer visible. Auto-scroll to latest on new message is the right default.
- **Forward button placement**: If it's on each card, users may miss the relay depth constraint. A persistent indicator near the forward button (not just in the header) would reduce confusion.

None of these are blockers for Phase 1. Flag for Phase 2.`,

  `Here's the core product risk: the tool is only as useful as the quality of the prompts. Two mediocre prompts sent to two models will produce two mediocre outputs, and the contrast won't be meaningful.

The prompt template in clipboard mode is a good start — it gives the model context and sets expectations. But you might want to go further: a lightweight "prompt quality" heuristic that checks for specificity, a clear question, and sufficient context before sending.

Not AI-graded. Just a checklist the human confirms. That alone would probably double the quality of ideation sessions.`,

  `The "no auto-relay" constraint is the right call, but it's worth being explicit about *why* in the UI itself — not just in documentation.

If a user doesn't understand why the Forward button requires a click and doesn't fire automatically, they'll see it as a limitation rather than a feature. A one-line tooltip or inline explanation ("You decide what gets forwarded — nothing moves without you") makes the design intent legible.

This is especially important on first use.`,

  `Looking at the message schema: the \`relayDepth\` field is on the message, but the \`maxRelayDepth\` is on session config. This is correct — but make sure the UI reflects both. Specifically:

- Show the *current* relay depth on each forwarded card (so users can track where they are in the chain)
- Show the *remaining* relays, not just used, in the depth badge (e.g. "2 relays remaining" not "1/3 used")

Remaining is more actionable than used. It tells you what you have, not what you've spent.`,
]

export function getMockResponse(sender: 'claude' | 'gpt'): string {
  const pool = sender === 'claude' ? CLAUDE_RESPONSES : GPT_RESPONSES
  return pool[Math.floor(Math.random() * pool.length)]
}
