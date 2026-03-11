import { z } from 'zod'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { ok } from '../utils/response'
import { zValidator } from '../utils/validator'
import { authMiddleware } from './auth'
import { getChatSessions, sessionQuerySchema } from './sessions'
import { getChatMessagesBySessionId, deleteChatMessagesBySessionId } from './messages'

export const chatAdminRouter = new Hono<{ Bindings: Env }>()

chatAdminRouter.use('/*', async (ctx, next) => {
  return cors({
    origin: ctx.env.ADMIN_API_CORS_ORIGIN,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'OPTIONS'],
    maxAge: 86400
  })(ctx, next)
})

chatAdminRouter.use('/*', async (ctx, next) => {
  // https://github.com/surmon-china/nodepress/blob/main/src/modules/admin/admin.controller.ts
  return authMiddleware({ verifyTokenEndpoint: ctx.env.ADMIN_API_VERIFY_TOKEN_ENDPOINT })(ctx, next)
})

chatAdminRouter.get('/chat-sessions', zValidator('query', sessionQuerySchema), async (ctx) => {
  const validQueryParams = ctx.req.valid('query')
  const { results: sessions } = await getChatSessions(ctx.env, validQueryParams)
  return ctx.json(ok(sessions))
})

chatAdminRouter.get(
  '/chat-sessions/:sessionId',
  zValidator('param', z.object({ sessionId: z.string() })),
  async (ctx) => {
    const { sessionId } = ctx.req.valid('param')
    const { results: messages } = await getChatMessagesBySessionId(sessionId, ctx.env)
    return ctx.json(ok(messages))
  }
)

chatAdminRouter.delete(
  '/chat-sessions/:sessionId',
  zValidator('param', z.object({ sessionId: z.string() })),
  async (ctx) => {
    const { sessionId } = ctx.req.valid('param')
    await deleteChatMessagesBySessionId(sessionId, ctx.env)
    return ctx.json(ok(null))
  }
)
