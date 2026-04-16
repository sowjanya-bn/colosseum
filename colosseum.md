# Colosseum — AI Ideation Relay

**Version:** 0.1 (design brief)
**Status:** pre-build
**Stack:** Vite + React + TypeScript, browser-only, no backend, no API keys stored server-side

---

## What It Is

A lightweight web prototype for structured ideation with two AI models — Claude and GPT — where the human remains the moderator and decision-maker at all times.

Not an autonomous chat system. Not an agent. A **thinking tool**.

The two models never talk to each other directly. The human controls every message, every forward, every relay turn. The value is in the contrast between two independent perspectives on the same prompt.

---

## Why Claude Code

This conversation was used for ideation and design. Claude Code is the right environment for the actual build — multi-file React project, proper component structure, TypeScript types, and iterative file editing are all things Claude Code handles natively.

Take this document into a Claude Code session and say: "Build Colosseum v1 from this spec."

---

## Core Concept

```
Human (moderator)
    │
    ├── sends prompt to Claude, GPT, or both
    │
    ├── reads independent responses side by side
    │
    ├── optionally forwards one response to the other
    │   (with or without a moderator note)
    │
    └── controls relay depth (max 3 turns)
```

The human is always the trigger. Nothing happens automatically.

---

## Default Participant Roles

These are system prompt defaults, fully editable in settings:

| Participant | Default Role |
|---|---|
| Claude | Reflective, conceptual, synthetic. Looks for underlying structure and tensions. |
| GPT | Structured, pragmatic, concrete. Looks for actionable clarity and edge cases. |
| Human | Moderator and decision-maker. Steers, injects context, decides what matters. |

---

## API Approach — No Keys, Browser OAuth

**Both APIs are called directly from the browser. No backend.**

### Claude
Use `claude.ai` web interface via copy-paste relay (v1), OR use the Anthropic API directly from the browser with the user's own API key entered in a settings panel (stored only in `sessionStorage`, never persisted).

### GPT
Same approach — OpenAI API called directly from browser with user-provided key in settings, stored in `sessionStorage` only.

### v1 fallback (truly zero-key)
If the user doesn't want to enter keys at all, the tool degrades gracefully to a **clipboard relay mode** — it generates the prompt, the user pastes it into each tab manually, and pastes responses back. The tool handles the formatting, context building, and display. This was prototyped in the ideation session and works well.

**No keys are ever sent to any server other than Anthropic/OpenAI directly.**

---

## MVP Feature Set

### Must have
- Single text input with target selector: `Claude` / `GPT` / `Both`
- Side-by-side response panels
- Forward button on any response — sends it to the other model
- Moderator note field — freeform prefix attached to any outgoing message
- Relay depth counter — max 3 turns, visible, hard-enforced
- Session transcript — running log of everything, in order
- Clipboard relay fallback — zero-key mode that generates copy-paste prompts

### Out of scope for v1
- Persistence or accounts
- Streaming responses
- Autonomous multi-turn without human trigger
- Model picker dropdowns
- Mobile layout

---

## Architecture

```
Browser (Vite + React + TypeScript)
    │
    ├── Anthropic API  ← fetch() direct from browser
    └── OpenAI API     ← fetch() direct from browser

State:    useReducer (in-memory, session only)
Storage:  sessionStorage for API keys only
No backend. No database. No auth.
```

If keys need to be hidden (e.g. sharing the tool), add a thin Express proxy later. Don't build it now.

---

## Component Breakdown

```
App
├── SessionProvider           global state + dispatch
├── Header
│   ├── SessionTitle          editable label
│   ├── RelayDepthBadge       shows X/3 relay turns used
│   └── SettingsButton        opens settings drawer
├── SettingsDrawer            API keys, system prompts, relay limit
├── Arena
│   ├── ModelPanel (×2)       Claude / GPT
│   │   ├── PanelHeader       model name + response count
│   │   ├── ResponseFeed      scrollable history of responses
│   │   │   └── ResponseCard  single response bubble
│   │   │       ├── Content   the response text
│   │   │       ├── Meta      timestamp, relay depth indicator
│   │   │       └── ForwardButton  → triggers relay to other model
│   │   └── LoadingState      typing indicator while awaiting response
│   └── TranscriptPanel       collapsible full session log
└── ModeratorBar
    ├── TargetSelector        Claude / GPT / Both
    ├── ModeratorNote         optional context prefix (toggleable)
    ├── MessageInput          main textarea
    └── SendButton
```

**Rule:** All sending happens through `ModeratorBar` only. No sending from inside panels. This keeps the information flow unambiguous.

---

## Message Schema

```typescript
type Sender   = 'human' | 'claude' | 'gpt'
type Target   = 'claude' | 'gpt' | 'both'
type Role     = 'user' | 'assistant' | 'moderator-note'

interface Message {
  id:              string       // uuid
  timestamp:       number       // unix ms
  sender:          Sender
  target:          Target
  role:            Role
  content:         string
  relayDepth:      number       // 0 = original, 1 = first relay, 2 = second, max 3
  forwardedFrom?:  Sender       // set if this is a forwarded message
  moderatorNote?:  string       // prepended context when forwarding
}

interface SessionState {
  messages:        Message[]    // global transcript, append-only
  claudeHistory:   Message[]    // messages relevant to Claude only
  gptHistory:      Message[]    // messages relevant to GPT only
  relayDepth:      number       // current relay depth counter
  maxRelayDepth:   number       // default 3, configurable
  isLoading:       { claude: boolean; gpt: boolean }
  config:          SessionConfig
}

interface SessionConfig {
  claudeKey?:      string       // sessionStorage only
  gptKey?:         string       // sessionStorage only
  claudeModel:     string       // default: 'claude-sonnet-4-6'
  gptModel:        string       // default: 'gpt-4o'
  claudeSystem:    string       // default role prompt
  gptSystem:       string       // default role prompt
  maxRelayDepth:   number       // 1–5, default 3
  clipboardMode:   boolean      // true = no API calls, pure copy-paste
}
```

---

## Routing and Relay Logic

```typescript
// Sending a new message
async function send(content: string, target: Target, note?: string) {
  const msg = buildMessage(content, target, 'human', 0, note)
  dispatch({ type: 'ADD_MESSAGE', msg })

  if (target === 'claude' || target === 'both') {
    dispatch({ type: 'SET_LOADING', model: 'claude', value: true })
    const reply = await callClaude(buildHistory('claude'), config)
    dispatch({ type: 'ADD_RESPONSE', sender: 'claude', content: reply })
    dispatch({ type: 'SET_LOADING', model: 'claude', value: false })
  }

  if (target === 'gpt' || target === 'both') {
    // parallel if both — Promise.all
    dispatch({ type: 'SET_LOADING', model: 'gpt', value: true })
    const reply = await callGPT(buildHistory('gpt'), config)
    dispatch({ type: 'ADD_RESPONSE', sender: 'gpt', content: reply })
    dispatch({ type: 'SET_LOADING', model: 'gpt', value: false })
  }
}

// Forwarding a response to the other model
async function forward(message: Message, note?: string) {
  if (state.relayDepth >= state.maxRelayDepth) {
    // Block and show warning — relay limit reached
    return
  }

  const toTarget: Target = message.sender === 'claude' ? 'gpt' : 'claude'
  const content = `[Forwarded from ${message.sender}]:\n\n${message.content}`
  const withNote = note ? `[Moderator note]: ${note}\n\n${content}` : content

  dispatch({ type: 'INCREMENT_RELAY_DEPTH' })
  await send(withNote, toTarget)
}

// Build history for a specific model's API call
function buildHistory(model: 'claude' | 'gpt'): APIMessage[] {
  return state.messages
    .filter(m => m.target === model || m.target === 'both' || m.sender === model)
    .map(m => ({ role: m.sender === model ? 'assistant' : 'user', content: m.content }))
}
```

---

## Guardrails

| Guardrail | Implementation |
|---|---|
| Relay depth cap | Hard limit (default 3). Forward button disabled at limit. Shows "relay limit reached" tooltip. |
| No auto-relay | Every relay requires a human click. No "let them go" mode in v1. |
| Cooldown on Both | Disable all send/forward buttons while awaiting responses. Re-enable when both resolve. |
| Visible relay chain | Every forwarded message shows `relay 1/3` badge and origin model. |
| No cross-contamination | Sending to Claude does not update GPT's history. Only forwarding does, and it is always explicit. |
| Key safety | API keys stored in `sessionStorage` only. Cleared on tab close. Never logged, never sent anywhere except the respective API. |

---

## Clipboard Relay Mode (Zero-Key Fallback)

When `clipboardMode: true` (or no API keys provided):

1. User types prompt and selects target
2. Tool generates formatted prompt text for each model, including context prefix that explains the relay setup
3. User clicks "Copy for Claude" → pastes into claude.ai tab
4. User clicks "Copy for GPT" → pastes into chatgpt.com tab
5. User pastes responses back into the tool
6. Tool displays them side by side, logs to transcript
7. Forward button generates the next forwarded prompt for manual copy-paste

The context prefix injected into each prompt:

```
[Colosseum Ideation Session]
Topic: {topic}
Your role: {roleDescription}
Note: Your response will be compared with another AI's response by a human moderator.
Be direct and substantive. The moderator may forward your response to the other model.

---

{userMessage}
```

---

## Phased Implementation Plan

### Phase 1 — Static shell (first session)
- Scaffold Vite + React + TypeScript project
- Build full UI with mock/hardcoded responses
- Validate the interaction model before any API calls
- Components: `Arena`, `ModelPanel`, `ResponseCard`, `ModeratorBar`, `TranscriptPanel`
- No state management beyond `useState` yet

### Phase 2 — State + schema (second session)
- Implement `SessionProvider` with `useReducer`
- Wire up full message schema and history-building logic
- Add `SettingsDrawer` with API key inputs (sessionStorage)
- No actual API calls yet — use mock async delays

### Phase 3 — Claude integration (third session)
- Wire up Anthropic API (direct browser fetch)
- Real responses, real history, loading states
- Test the full send → receive → forward flow with one model

### Phase 4 — GPT + relay (fourth session)
- Add OpenAI API
- Implement relay depth tracking and guardrails
- Both models working, Forward button fully functional
- Relay depth counter visible and enforced

### Phase 5 — Clipboard mode + polish (fifth session)
- Implement clipboard relay fallback
- Prompt formatting with context prefix
- Copy buttons, transcript export (markdown)
- Error handling, loading states, edge cases
- System prompt editing in settings

---

## What to Postpone

| Feature | Why |
|---|---|
| Streaming responses | Adds complexity, saves ~3 seconds. Not worth it for a thinking tool — you want to read the full response before deciding what to do. |
| Persistence / database | Use "Export transcript" for now. A database is a week of work for a feature you may not need. |
| Backend / proxy | Fine for a personal tool. Add when you want to share it publicly. |
| Model picker | Defaults are fine. Don't build a dropdown in v1. |
| Autonomous relay | This is the thing most likely to make the tool worse. The human-in-the-loop is the product. Resist it. |
| Mobile layout | Side-by-side panels need width. Desktop first. |
| Authentication | Not needed for a personal tool. |
| Conversation branching | Interesting, but scope-creeping. Log it for v2. |

---

## How to Start the Build

```bash
# Create the repo
mkdir colosseum && cd colosseum
git init

# Scaffold with Vite
npm create vite@latest . -- --template react-ts
npm install

# Start Claude Code
claude

# First prompt to Claude Code:
# "Build Colosseum v1 from the spec in colosseum.md.
#  Start with Phase 1 — static shell with mock responses.
#  No API calls yet. Just get the UI and interaction model right."
```

---

## Key Design Decisions (Record of Reasoning)

**Why no backend?** This is a personal thinking tool. Adding a server introduces deployment complexity, hosting costs, and key management overhead that aren't justified for v1. The browser-direct approach is simpler, faster to build, and sufficient for the use case.

**Why clipboard mode?** Some users won't want to paste API keys anywhere, even into a local tool. The clipboard fallback makes the tool useful without any API setup. It also clearly demonstrates the relay mechanic without any magic.

**Why relay depth cap?** Open-ended relay loops produce diminishing returns quickly. Models start agreeing with each other or going in circles. Capping at 3 forces the human to re-engage, which is the point — this is a thinking tool, not an autonomous system.

**Why no streaming?** For ideation, you want to read the complete thought before deciding what to do with it. Streaming creates the illusion of speed but doesn't actually help you think faster. It also complicates the relay logic.

**Why roles as system prompts?** Hardcoding roles into the UI would make the tool feel rigid. Putting them in system prompts makes them fully editable without changing the code. The defaults (Claude = reflective, GPT = pragmatic) are opinionated starting points, not constraints.

---

*Generated during ideation session with Claude Sonnet 4.6 — April 2026*
