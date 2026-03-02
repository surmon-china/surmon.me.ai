import { Hono } from 'hono'
import type { Bindings } from '../env'

export const queryRag = async (ctx: Bindings) => {
  // const { message } = await ctx.req.json()
  // // https://developers.cloudflare.com/ai-search/usage/workers-binding/
  // const searchResults = await env.AI.autorag('surmon-me-rag').aiSearch({
  //   query: message,
  //   model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  //   rewrite_query: true,
  //   max_num_results: 2,
  //   ranking_options: {
  //     score_threshold: 0.3
  //   },
  //   reranking: {
  //     enabled: true,
  //     model: '@cf/baai/bge-reranker-base'
  //   },
  //   stream: true
  // })
  // const context = searchResults.results.map((r) => r.content).join('\n')
  // const answer = await callGemini({
  //   system: '你是一个博客助手，请根据以下背景资料回答：',
  //   context: context,
  //   question: message
  // })
  // return ctx.json({ answer })
}
