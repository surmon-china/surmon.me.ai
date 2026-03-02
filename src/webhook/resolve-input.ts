import { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { Bindings } from '../env'
import type { WebhookInput } from './index'

// https://github.com/surmon-china/nodepress/blob/main/src/modules/webhook/webhook.service.ts
export const resolveWebhookInput = async (c: Context<{ Bindings: Bindings }>): Promise<WebhookInput> => {
  const signature = c.req.header('X-Webhook-Signature')
  const timestamp = c.req.header('X-Webhook-Timestamp')
  const secret = c.env.WEBHOOK_SECRET

  // 1. Basic verification
  if (!signature || !timestamp || !secret) {
    throw new HTTPException(401, { message: 'Authentication headers or secret missing' })
  }

  // 2. Anti-replay attack (5 minutes)
  if (Math.abs(Date.now() - parseInt(timestamp)) > 5 * 60 * 1000) {
    throw new HTTPException(401, { message: 'Webhook request expired' })
  }

  const rawBody = await c.req.text()
  if (!rawBody) {
    throw new HTTPException(400, { message: 'Empty request body' })
  }

  // 3. Web Crypto API Signature Verification
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody))
  const localSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  if (localSignature !== signature) {
    console.error('[Webhook] Signature mismatch')
    throw new HTTPException(401, { message: 'Invalid signature' })
  }

  try {
    return JSON.parse(rawBody) as WebhookInput
  } catch (e) {
    throw new HTTPException(400, { message: 'Invalid JSON payload' })
  }
}
