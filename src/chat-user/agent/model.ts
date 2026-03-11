import { z } from 'zod'
import type { Tool } from './tool'
import type { ModelMessage } from '../database/model-message'

export interface CallModelOptions {
  env: Env
  model: string
  messages: ModelMessage[]
  tools?: Record<string, Tool>
  signal?: AbortSignal
}

export const callModel = async (options: CallModelOptions): Promise<Response> => {
  const { env, model, messages, tools, signal } = options

  const openaiTools = Object.entries(tools ?? {}).map(([name, tool]) => ({
    type: 'function' as const,
    function: {
      name,
      description: tool.description,
      parameters: z.toJSONSchema(tool.inputSchema)
    }
  }))

  // AI Gateway compat endpoint (OpenAI-compatible format).
  // https://developers.cloudflare.com/ai-gateway/integrations/worker-binding-methods/#33-geturl-get-gateway-urls
  // https://developers.cloudflare.com/ai-gateway/integrations/worker-binding-methods/#34-run-universal-requests
  // Note: env.AI.gateway().run() and env.AI.gateway().getUrl() are NOT applicable here —
  // they target the Universal Endpoint format, which uses a different request/response protocol.
  // The compat endpoint is preferred for its model-agnostic interface,
  // making it straightforward to switch providers without changing the calling code.
  // https://developers.cloudflare.com/ai-gateway/features/unified-billing/#use-unified-billing
  const response = await fetch(
    `https://gateway.ai.cloudflare.com/v1/${env.CF_ACCOUNT_ID}/${env.CF_AI_GATEWAY_ID}/compat/chat/completions`,
    {
      method: 'POST',
      // Note: AbortSignal may not reliably cancel the in-flight request in Cloudflare Workers.
      // If abort does not take effect, the 'aborted' flag in the stream handler ensures no further
      // data is written to the client — the only cost is the token usage for that LLM call.
      signal,
      headers: {
        'Content-Type': 'application/json',
        'cf-aig-authorization': `Bearer ${env.CF_AIG_TOKEN}`
      },
      body: JSON.stringify({
        model,
        messages,
        tools: openaiTools.length ? openaiTools : undefined,
        stream: true,
        stream_options: { include_usage: true }
      })
    }
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`LLM ${response.status}: ${body}`)
  }

  return response
}
