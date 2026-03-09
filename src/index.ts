import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { verifyWebhookInput } from './webhook/verify'
import { resolveWebhook } from './webhook'
import { chatAdminRouter } from './chat-admin'
import { chatAgentRouter } from './chat-user'
import { fail, ok } from './utils/response'
import packageJson from '../package.json'

const app = new Hono<{ Bindings: Env }>()

app.onError((error, ctx) => {
  console.error('[Global Error]:', error)
  return error instanceof HTTPException
    ? ctx.json(fail(error.message, error.cause), error.status)
    : ctx.json(fail(error.message, error.cause), 500)
})

app.get('/', (ctx) => {
  return ctx.json({
    name: packageJson.name,
    version: packageJson.version,
    author: packageJson.author,
    repository: packageJson.repository.url
  })
})

// For NodePress webhook
app.post('/webhook', async (ctx) => {
  const webhookInput = await verifyWebhookInput(ctx)
  ctx.executionCtx.waitUntil(resolveWebhook(webhookInput, ctx.env))
  return ctx.json(ok('Webhook processed successfully'))
})

// For admin query sessions
app.route('/admin', chatAdminRouter)

// For user chat agent
app.route('/chat', chatAgentRouter)

export default app
