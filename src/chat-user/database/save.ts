import type { ChatMessage, PartialBy } from '../../database/interface'

export type InsertChatMessage = PartialBy<
  ChatMessage,
  | 'id'
  | 'author_name'
  | 'author_email'
  | 'user_id'
  | 'content'
  | 'model'
  | 'tool_calls'
  | 'tool_call_id'
  | 'input_tokens'
  | 'output_tokens'
  | 'created_at'
>

export const saveMessages = async (env: Env, messages: InsertChatMessage[]): Promise<void> => {
  if (!messages.length) return

  const stmt = env.AGENT_DB.prepare(
    `INSERT INTO chat_messages
       (session_id, author_name, author_email, user_id,
        role, content, model, tool_calls, tool_call_id,
        input_tokens, output_tokens)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )

  await env.AGENT_DB.batch(
    messages.map((m) =>
      stmt.bind(
        m.session_id,
        m.author_name ?? null,
        m.author_email ?? null,
        m.user_id ?? null,
        m.role,
        m.content ?? null,
        m.model ?? null,
        m.tool_calls ?? null,
        m.tool_call_id ?? null,
        m.input_tokens ?? 0,
        m.output_tokens ?? 0
      )
    )
  ).catch((err) => console.error('[D1 Batch Error]', err))
}
