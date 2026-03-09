import type { ChatMessage, ChatMessageRole } from '../../database/interface'

export interface ModelToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export interface ModelMessage {
  role: ChatMessageRole
  content: string | null
  tool_calls?: ModelToolCall[]
  tool_call_id?: string
}

export const getHistoryForModel = async (
  env: Env,
  sessionId: string,
  maxRounds = 5
): Promise<ModelMessage[]> => {
  // Fetch only plain user/assistant messages, excluding all tool-related rows.
  // RAG tool results can be very large; retaining them across rounds wastes tokens
  // without meaningful benefit to conversational context.
  const { results } = await env.AGENT_DB.prepare(
    `SELECT role, content
     FROM chat_messages
     WHERE session_id = ? AND role IN ('user', 'assistant') AND tool_calls IS NULL
     ORDER BY id DESC LIMIT ?`
  )
    .bind(sessionId, maxRounds * 2)
    .all<Pick<ChatMessage, 'role' | 'content'>>()

  if (!results.length) return []

  // Reverse to restore chronological order after DESC fetch.
  return results.reverse().map((row) => ({
    role: row.role,
    content: row.content
  }))
}
