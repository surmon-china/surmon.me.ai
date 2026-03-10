export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type ChatMessageRole = 'user' | 'assistant' | 'system' | 'tool'

export interface ChatMessage {
  id: number
  session_id: string
  author_name: string | null
  author_email: string | null
  user_id: string | null
  role: ChatMessageRole
  content: string | null
  model: string | null
  tool_calls: string | null
  tool_call_id: string | null
  input_tokens: number
  output_tokens: number
  created_at: number
}
