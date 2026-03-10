import type { ChatMessage, ChatMessageRole } from '../../database/interface'

export interface ClientMessage {
  role: ChatMessageRole
  content: string
  created_at: number
}

export const getHistoryForClient = async (
  env: Env,
  sessionId: string,
  limit = 50
): Promise<ClientMessage[]> => {
  const { results } = await env.AGENT_DB.prepare(
    `SELECT role, content, created_at
     FROM chat_messages
     WHERE session_id = ? AND role IN ('user', 'assistant') AND content IS NOT NULL AND tool_calls IS NULL
     ORDER BY id DESC LIMIT ?`
  )
    .bind(sessionId, limit)
    .all<ChatMessage>()

  return results.reverse().map((row) => ({
    role: row.role,
    content: row.content!,
    created_at: row.created_at ?? Math.floor(Date.now() / 1000)
  }))
}
