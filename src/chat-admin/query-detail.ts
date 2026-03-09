import { ChatMessage } from '../database/interface'

export const getChatMessagesBySessionId = async (sessionId: string, env: Env) => {
  return env.AGENT_DB.prepare(`SELECT * FROM chat_messages WHERE session_id = ? ORDER BY id ASC`)
    .bind(sessionId)
    .all<ChatMessage>()
}
