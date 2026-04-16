export type Sender = 'human' | 'claude' | 'gpt'
export type Target = 'claude' | 'gpt' | 'both'

export interface Message {
  id: string
  timestamp: number
  sender: Sender
  target: Target
  content: string
  relayDepth: number
  forwardedFrom?: Sender
  moderatorNote?: string
  source?: 'live' | 'mock'   // where the response actually came from
}

export interface LoadingState {
  claude: boolean
  gpt: boolean
}
