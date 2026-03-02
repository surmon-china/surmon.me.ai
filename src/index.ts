import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { Bindings } from './env'
import { handleWebhook } from './webhook'
import { resolveWebhookInput } from './webhook/resolve-input'
import packageJson from '../package.json'

const app = new Hono<{ Bindings: Bindings }>()

app.onError((error, ctx) => {
  console.error(`[Global Error]: ${error.message}`, error)
  return error instanceof HTTPException
    ? error.getResponse()
    : ctx.json({ success: false, message: error.message }, 500)
})

app.get('/', (ctx) => {
  return ctx.json({
    name: packageJson.name,
    version: packageJson.version,
    author: packageJson.author,
    repository: packageJson.repository.url
  })
})

app.post('/webhook', async (ctx) => {
  const webhookInput = await resolveWebhookInput(ctx)
  ctx.executionCtx.waitUntil(handleWebhook(webhookInput, ctx.env))
  return ctx.json({ success: true, message: 'Webhook processed successfully' })
})

export default app
