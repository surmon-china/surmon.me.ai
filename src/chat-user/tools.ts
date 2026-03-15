import { z } from 'zod'
import { defineTool } from './agent/tool'
import { getArticleUrl, getArticleMarkdownFileName } from '../webhook/resolve-article'
import type { NodePressArticle } from '../webhook/resolve-article'
import * as CONFIG from '../config'

export const getAgentTools = (env: Env) => ({
  getBlogList: defineTool({
    description: 'Fetch the latest article list from the blog.',
    inputSchema: z.object({}),
    execute: async () => {
      const response = await fetch('https://api.surmon.me/articles?per_page=8')
      if (!response.ok) throw new Error(`Failed to fetch article list: ${response.status}`)
      const { result } = (await response.json()) as { result: { data: NodePressArticle[] } }
      return result.data.map((article) => ({
        id: article.id,
        title: article.title,
        summary: article.summary,
        stats: article.stats,
        url: getArticleUrl(article.id)
      }))
    }
  }),

  getArticleDetail: defineTool({
    description: 'Fetch the full Markdown content of an article by its ID.',
    inputSchema: z.object({
      articleId: z.number().describe('The unique integer ID of the article.')
    }),
    execute: async ({ articleId }) => {
      const markdownFile = await env.RAG_BUCKET.get(getArticleMarkdownFileName(articleId))
      if (!markdownFile) throw new Error(`Failed to fetch article ${articleId}.`)
      return await markdownFile.text()
    }
  }),

  getOpenSourceProjects: defineTool({
    description: "Fetch the author's open-source project list from GitHub.",
    inputSchema: z.object({}),
    execute: async () => {
      const response = await fetch(
        `https://raw.githubusercontent.com/surmon-china/surmon-china/release/github.json`
      )
      if (!response.ok) throw new Error(`Failed to fetch open-source projects: ${response.status}`)
      const { repositories } = (await response.json()) as any
      return repositories
        .filter((repository: any) => !repository.fork)
        .sort((a: any, b: any) => b.stargazers_count - a.stargazers_count)
        .slice(0, 50)
        .map((repository: any) => ({
          name: repository.name,
          description: repository.description,
          language: repository.language,
          archived: repository.archived,
          stargazers_count: repository.stargazers_count,
          url: repository.html_url
        }))
    }
  }),

  getThreadsMedias: defineTool({
    description:
      "Get the blog author's latest social media posts (Threads), including text, pictures, videos, etc., to understand the author's recent thoughts, life status, and topics of interest.",
    inputSchema: z.object({}),
    execute: async () => {
      const response = await fetch('https://surmon.me/_tunnel/threads_medias')
      if (!response.ok) throw new Error(`Failed to fetch threads medias: ${response.status}`)
      const { data } = await response.json<{ data: Array<any> }>()
      // Only retain content from the most recent month, filtering out media without text (images/videos without captions).
      const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
      return data
        .filter((item) => {
          // Text that is too short is of no value to LLM.
          return item.text && item.text.length >= 5 && new Date(item.timestamp).getTime() > oneMonthAgo
        })
        .map((item) => ({
          text: item.text,
          timestamp: item.timestamp,
          media_type: item.media_type
        }))
    }
  }),

  askKnowledgeBase: defineTool({
    description:
      "Search the private knowledge base about the blog author's personal experiences, hobbies, opinions, thoughts, and writing. Returns the most relevant excerpts in a single call.",
    inputSchema: z.object({
      query: z
        .string()
        .describe("A specific search query describing the author's opinions, experiences, or thoughts.")
    }),
    execute: async ({ query }) => {
      const { chunks } = await env.AI.aiSearch()
        .get(env.CF_AI_SEARCH_INSTANCE_NAME)
        .search({
          messages: [{ role: 'user', content: query }],
          ai_search_options: {
            retrieval: { max_num_results: CONFIG.CHAT_AGENT_RAG_SEARCH_MAX_RESULTS },
            query_rewrite: { enabled: true },
            reranking: { enabled: true, model: '@cf/baai/bge-reranker-base' }
          }
        })

      if (!chunks.length) return 'No relevant content found.'
      return chunks.map((chunk, index) => ({
        rank: index + 1,
        article_id: chunk.item.metadata!.id,
        article_url: chunk.item.metadata!.url,
        article_title: chunk.item.metadata!.title,
        excerpt: chunk.text.slice(0, CONFIG.CHAT_AGENT_RAG_CHUNK_MAX_LENGTH)
      }))
    }
  })
})
