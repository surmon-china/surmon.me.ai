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
          stargazers_count: repository.stargazers_count,
          url: repository.html_url
        }))
    }
  }),

  askKnowledgeBase: defineTool({
    description:
      "Search the private knowledge base about the blog author's personal experiences, hobbies, opinions, thoughts, and writing.",
    inputSchema: z.object({
      query: z.string().describe('The specific question to retrieve from the knowledge base.')
    }),
    execute: async ({ query }) => {
      const results = await env.AI.aiSearch()
        .get(env.CF_AI_SEARCH_INSTANCE_NAME)
        .search({
          messages: [{ role: 'user', content: query }],
          ai_search_options: {
            retrieval: { max_num_results: CONFIG.CHAT_AGENT_RAG_SEARCH_MAX_RESULTS },
            query_rewrite: { enabled: true },
            reranking: { enabled: true, model: '@cf/baai/bge-reranker-base' }
          }
        })

      return (
        (results.chunks || []).map((chunk) => `[${chunk.item.key}]\n${chunk.text}`).join('\n\n') ||
        'No relevant content found.'
      )
    }
  })
})
