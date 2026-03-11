import { z } from 'zod'

export interface ChatSession {
  session_id: string
  last_active: number
  last_user_message: string | null
  message_count: number
  input_tokens: number
  output_tokens: number
  total_tokens: number
  author_name: string | null
  author_email: string | null
  user_id: number | null
}

export const sessionQuerySchema = z.object({
  author_name: z.string().optional(),
  author_email: z.string().optional(),
  user_id: z.coerce.number().optional(),
  page: z.coerce.number().int().min(1).optional(),
  page_size: z.coerce.number().int().min(1).max(50).optional(),
  sort_field: z.enum(['last_active', 'message_count', 'total_tokens']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional()
})

export type SessionQueryParams = z.infer<typeof sessionQuerySchema>
export type SessionSortField = NonNullable<SessionQueryParams['sort_field']>

export const getChatSessions = async (env: Env, params: SessionQueryParams) => {
  const page = params.page ?? 1
  const pageSize = params.page_size ?? 16
  const offset = (page - 1) * pageSize
  const sortField = params.sort_field ?? 'last_active'
  const sortOrder = params.sort_order === 'asc' ? 'ASC' : 'DESC'

  let sql = `
    SELECT
      s.session_id,
      m.created_at AS last_active,
      um.content AS last_user_message,
      s.message_count,
      s.input_tokens,
      s.output_tokens,
      s.total_tokens,
      um.author_name,
      um.author_email,
      um.user_id
    FROM (
      SELECT
        session_id,
        MAX(id) AS last_message_id,
        MAX(CASE WHEN role = 'user' THEN id END) AS last_user_message_id,
        COUNT(*) AS message_count,
        COALESCE(SUM(input_tokens), 0) AS input_tokens,
        COALESCE(SUM(output_tokens), 0) AS output_tokens,
        COALESCE(SUM(input_tokens + output_tokens), 0) AS total_tokens
      FROM chat_messages
      GROUP BY session_id
    ) s
    JOIN chat_messages m ON m.id = s.last_message_id
    LEFT JOIN chat_messages um ON um.id = s.last_user_message_id
    WHERE 1=1
  `

  const binds: any[] = []

  if (params.author_name) {
    sql += ` AND um.author_name LIKE ?`
    binds.push(`%${params.author_name}%`)
  }
  if (params.author_email) {
    sql += ` AND um.author_email LIKE ?`
    binds.push(`%${params.author_email}%`)
  }
  if (params.user_id) {
    sql += ` AND um.user_id = ?`
    binds.push(params.user_id)
  }

  const sortMap: Record<SessionSortField, string> = {
    last_active: 's.last_message_id',
    message_count: 's.message_count',
    total_tokens: 's.total_tokens'
  }

  sql += ` ORDER BY ${sortMap[sortField]} ${sortOrder} LIMIT ? OFFSET ?`
  binds.push(pageSize, offset)

  return env.AGENT_DB.prepare(sql)
    .bind(...binds)
    .all<ChatSession>()
}
