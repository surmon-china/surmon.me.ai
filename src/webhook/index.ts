import { HTTPException } from 'hono/http-exception'
import { upsertArticlesToBucket, deleteArticlesFromBucket } from './resolve-article'
import { upsertOptionsToBucket } from './resolve-options'

// https://github.com/surmon-china/nodepress/blob/main/src/modules/webhook/webhook.constant.ts
export enum WebhookEvent {
  UpsertArticles = 'upsert_articles',
  DeleteArticles = 'delete_articles',
  UpsertOptions = 'upsert_options'
}

export interface WebhookInput {
  event: WebhookEvent
  payload: any
  timestamp: number
}

export const resolveWebhook = async (input: WebhookInput, env: Env) => {
  const { event, payload } = input

  try {
    switch (event) {
      case WebhookEvent.UpsertArticles: {
        const articles = Array.isArray(payload) ? payload : [payload]
        await upsertArticlesToBucket(articles, env)
        break
      }
      case WebhookEvent.DeleteArticles: {
        const articleIds = Array.isArray(payload) ? payload : [payload]
        await deleteArticlesFromBucket(articleIds, env)
        break
      }
      case WebhookEvent.UpsertOptions: {
        await upsertOptionsToBucket(payload, env)
        break
      }
      default:
        console.warn(`[Webhook] Unhandled event: ${event}`)
        throw new HTTPException(400, { message: `Unhandled event type: ${event}` })
    }
  } catch (error: any) {
    console.error('[Webhook Error]', error)
    if (error instanceof HTTPException) throw error
    throw new HTTPException(500, { message: 'Internal server error processing webhook' })
  }
}
