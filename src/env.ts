// https://developers.cloudflare.com/workers/languages/typescript/
// https://developers.cloudflare.com/ai-gateway/integrations/worker-binding-methods/
export type Bindings = {
  AI: Ai
  RAG_BUCKET: R2Bucket
  WEBHOOK_SECRET: string
}
