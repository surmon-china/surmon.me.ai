import { z } from 'zod'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { stream } from 'hono/streaming'
import { fail, ok } from '../utils/response'
import { zValidator } from '../utils/validator'
import { ipRateLimit } from '../utils/rate-limit'

import { getHistoryForClient } from './database/client-message'
import { type ModelMessage, getHistoryForModel } from './database/model-message'
import { type InsertChatMessage, saveMessages } from './database/save'
import { signToken, verifyToken } from './signature'
import { generateSystemPrompt } from './prompt'
import { getAgentTools } from './tools'
import { runAgent } from './agent'
import * as CONFIG from '../config'

export const chatAgentRouter = new Hono<{ Bindings: Env }>()

chatAgentRouter.use('/*', async (ctx, next) => {
  return cors({
    origin: ctx.env.CHAT_API_CORS_ORIGIN,
    allowHeaders: ['Content-Type', CONFIG.CHAT_API_TOKEN_HEADER_NAME],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    maxAge: 86400
  })(ctx, next)
})

chatAgentRouter.get(
  '/token',
  ipRateLimit((ctx) => ctx.env.AI_TOKEN_RATE_LIMITER),
  async (ctx) => {
    const token = await signToken(crypto.randomUUID(), ctx.env.CHAT_TOKEN_SECRET)
    return ctx.json(ok(token))
  }
)

chatAgentRouter.get(
  '/history',
  zValidator('header', z.object({ [CONFIG.CHAT_API_TOKEN_HEADER_NAME]: z.string() })),
  async (ctx) => {
    const token = ctx.req.valid('header')[CONFIG.CHAT_API_TOKEN_HEADER_NAME]
    const sessionId = await verifyToken(token, ctx.env.CHAT_TOKEN_SECRET)
    if (!sessionId) return ctx.json(fail('Invalid session'), 403)

    const messages = await getHistoryForClient(ctx.env, sessionId, CONFIG.CHAT_API_USER_HISTORY_LIST_LIMIT)
    return ctx.json(ok(messages))
  }
)

chatAgentRouter.post(
  '/',
  zValidator('header', z.object({ [CONFIG.CHAT_API_TOKEN_HEADER_NAME]: z.string() })),
  zValidator(
    'json',
    z.object({
      message: z.string().min(1).max(CONFIG.CHAT_AGENT_USER_MESSAGE_MAX_LENGTH),
      author_name: z.string().max(50).optional(),
      author_email: z.email().optional().or(z.literal('')),
      user_id: z.string().optional()
    })
  ),
  async (ctx) => {
    const token = ctx.req.valid('header')[CONFIG.CHAT_API_TOKEN_HEADER_NAME]
    const sessionId = await verifyToken(token, ctx.env.CHAT_TOKEN_SECRET)
    if (!sessionId) return ctx.json(fail('Invalid token'), 403)

    const { message, ...userContext } = ctx.req.valid('json')

    // Rate limiting per session within a rolling time window.
    const { results } = await ctx.env.AGENT_DB.prepare(
      `SELECT COUNT(*) as count, COALESCE(SUM(input_tokens + output_tokens), 0) as tokens
       FROM chat_messages WHERE session_id = ? AND created_at >= unixepoch() - ${CONFIG.CHAT_AGENT_RATE_LIMIT_ROLLING_WINDOW_HOURS * 3600}`
    )
      .bind(sessionId)
      .all<{ count: number; tokens: number }>()

    if (results[0].count >= CONFIG.CHAT_AGENT_RATE_LIMIT_MAX_MESSAGES) {
      return ctx.json(fail('Message limit reached, please try again later.'), 429)
    }

    if (results[0].tokens >= CONFIG.CHAT_AGENT_RATE_LIMIT_MAX_TOKENS) {
      return ctx.json(fail('Token limit reached, please try again later.'), 429)
    }

    // System-level prompts
    const siteMetaInfoFile = await ctx.env.RAG_BUCKET.get(CONFIG.SITE_METAINFO_MARKDOWN_FILE_NAME)
    const systemMessage: ModelMessage = {
      role: 'system',
      content: generateSystemPrompt({
        contextUserName: userContext.author_name,
        siteMetaInfo: (await siteMetaInfoFile?.text()) || 'Null',
        siteName: CONFIG.CHAT_AGENT_PROMPT_SITE_NAME,
        siteMasterName: CONFIG.CHAT_AGENT_PROMPT_SITE_MASTER_NAME
      })
    }

    // Construct a symmetric message list
    const historyMessages = await getHistoryForModel(
      ctx.env,
      sessionId,
      CONFIG.CHAT_AGENT_USER_HISTORY_MESSAGES_MAX_ROUNDS
    )
    const userMessage: ModelMessage = { role: 'user', content: message }
    const inputMessages: ModelMessage[] = [systemMessage, ...historyMessages, userMessage]

    // Note: These headers must be set before the stream is executed.
    ctx.header('Content-Type', 'text/event-stream; charset=utf-8')
    ctx.header('Cache-Control', 'no-cache')
    ctx.header('Connection', 'keep-alive')

    return stream(ctx, async (honoStream) => {
      let aborted = false
      const abortController = new AbortController()

      honoStream.onAbort(() => {
        aborted = true
        abortController.abort()
      })

      await runAgent({
        env: ctx.env,
        model: 'google-ai-studio/gemini-2.5-flash',
        messages: inputMessages,
        tools: getAgentTools(ctx.env),
        maxSteps: CONFIG.CHAT_AGENT_TOOL_CALL_MAX_STEPS,
        sessionId,
        signal: abortController.signal,
        onStreamEvent: async (event) => {
          if (aborted) return
          await honoStream.write(`data: ${JSON.stringify(event)}\n\n`)
        },
        onFinish: (modelMessages) => {
          const userMessage: InsertChatMessage = {
            session_id: sessionId,
            role: 'user',
            content: message,
            ...userContext
          }
          ctx.executionCtx.waitUntil(saveMessages(ctx.env, [userMessage, ...modelMessages]))
        }
      })
    })
  }
)
