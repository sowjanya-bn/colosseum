import { Message, LoadingState } from './types'

export interface SessionConfig {
  sessionTitle:    string
  claudeSystem:    string
  gptSystem:       string
  maxRelayDepth:   number   // 1–5
}

export interface ClipboardPending {
  prompt:     string   // formatted prompt ready to copy
  humanMsgId: string   // the human message this is responding to
}

export interface SessionState {
  messages:          Message[]
  relayDepth:        number
  loading:           LoadingState
  config:            SessionConfig
  sessionStarted:    boolean
  clipboardPending:  { claude?: ClipboardPending; gpt?: ClipboardPending }
  pullReady:         { claude: boolean; gpt: boolean }
}

export type Action =
  | { type: 'ADD_MESSAGE';           message: Message }
  | { type: 'SET_LOADING';           model: 'claude' | 'gpt'; value: boolean }
  | { type: 'INCREMENT_RELAY' }
  | { type: 'UPDATE_CONFIG';         patch: Partial<SessionConfig> }
  | { type: 'SET_CLIPBOARD_PENDING'; model: 'claude' | 'gpt'; pending: ClipboardPending }
  | { type: 'CLEAR_CLIPBOARD';       model: 'claude' | 'gpt' }
  | { type: 'SET_PULL_READY';        model: 'claude' | 'gpt'; value: boolean }
  | { type: 'RESET_RELAY' }
  | { type: 'RESET_SESSION' }

export const DEFAULT_CONFIG: SessionConfig = {
  sessionTitle:  '',
  claudeSystem:  'Reflective, conceptual, synthetic. Look for underlying structure, tensions, and hidden assumptions. Ask what the question behind the question is.',
  gptSystem:     'Structured, pragmatic, concrete. Look for actionable clarity, edge cases, and implementation risks. Be direct about tradeoffs.',
  maxRelayDepth: 3,
}

export const INITIAL_STATE: SessionState = {
  messages:         [],
  relayDepth:       0,
  loading:          { claude: false, gpt: false },
  config:           DEFAULT_CONFIG,
  sessionStarted:   false,
  clipboardPending: {},
  pullReady:        { claude: false, gpt: false },
}

export function reducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages:       [...state.messages, action.message],
        sessionStarted: true,
      }

    case 'SET_LOADING':
      return {
        ...state,
        loading: { ...state.loading, [action.model]: action.value },
      }

    case 'INCREMENT_RELAY':
      return { ...state, relayDepth: state.relayDepth + 1 }

    case 'UPDATE_CONFIG':
      return { ...state, config: { ...state.config, ...action.patch } }

    case 'SET_CLIPBOARD_PENDING':
      return {
        ...state,
        clipboardPending: { ...state.clipboardPending, [action.model]: action.pending },
        sessionStarted: true,
      }

    case 'CLEAR_CLIPBOARD':
      return {
        ...state,
        clipboardPending: { ...state.clipboardPending, [action.model]: undefined },
      }

    case 'SET_PULL_READY':
      return { ...state, pullReady: { ...state.pullReady, [action.model]: action.value } }

    case 'RESET_RELAY':
      return { ...state, relayDepth: 0 }

    case 'RESET_SESSION':
      return { ...INITIAL_STATE, config: state.config }

    default:
      return state
  }
}
