import { z } from 'zod'
import { defineTool } from './agent/tool'
import { getArticleMarkdownFileName } from '../webhook/resolve-article'
import * as CONFIG from '../config'

export const getAgentTools = (env: Env) => ({
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

  getSiteInformation: defineTool({
    description: 'Fetch site information such as statements and FAQ.',
    inputSchema: z.object({}),
    execute: async () => {
      const markdownFile = await env.RAG_BUCKET.get(CONFIG.SITE_INFO_MARKDOWN_FILE_NAME)
      if (!markdownFile) throw new Error(`Failed to fetch site information.`)
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
    description: "Fetch the author's recent Threads posts, including text, images, and videos.",
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

  getTravelFootprint: defineTool({
    description:
      "Fetch the author's travel footprint, including all trips and route segments with transport types.",
    inputSchema: z.object({}),
    execute: async () => {
      const response = await fetch('https://static.surmon.me/data/footprint-trips.json')
      if (!response.ok) throw new Error(`Failed to fetch travel footprint: ${response.status}`)
      const trips = await response.json<Array<any>>()
      return trips.map((trip) => ({
        id: trip.id,
        name: trip.name,
        segments: trip.segments.map((segment: any) => ({
          name: segment.name,
          transport: segment.transport
        }))
      }))
    }
  }),

  askKnowledgeBase: defineTool({
    description: 'Search the blog knowledge base and return relevant excerpts.',
    inputSchema: z.object({
      query: z
        .string()
        .describe('A concise search query that captures the core topic or intent of the user question.')
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
        article_date: chunk.item.metadata!.created_at ?? null,
        excerpt: chunk.text.slice(0, CONFIG.CHAT_AGENT_RAG_CHUNK_MAX_LENGTH)
      }))
    }
  })
})
