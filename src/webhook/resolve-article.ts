import type { Bindings } from '../env'

// https://github.com/surmon-china/nodepress/blob/main/src/modules/article/article.model.ts
export interface Article {
  id: number
  title: string
  summary: string
  keywords: string[]
  content: string
  thumbnail: string
  origin: string
  lang: string
  featured: boolean
  disabled_comments: boolean
  tags: Array<{ name: string; slug: string }>
  categories: Array<{ name: string; slug: string }>
  stats: {
    likes: number
    views: number
    comments: number
  }
  extras: Array<{ key: string; value: string }>
  updated_at: string
  created_at: string
}

const getArticleUrl = (articleId: number): string => {
  return `https://surmon.me/article/${articleId}`
}

const getArticleMarkdownFileName = (articleId: number): string => {
  return `article-${articleId}.md`
}

const transformArticleToMarkdown = (article: Article): string => {
  const safeStr = (str?: string) => (str || '').replace(/"/g, '\\"')
  const getSummary = (article: Article) => {
    const aiSummary = article.extras.find((item) => item.key === 'ai-summary-content')
    return aiSummary?.value || article.summary
  }

  return `---
id: ${article.id}
title: "${safeStr(article.title)}"
summary: "${getSummary(article)}"
categories: [${article.categories.map((i) => `"${i.slug}"`).join(', ')}]
tags: [${article.tags.map((i) => `"${i.slug}"`).join(', ')}]
date: "${article.created_at || new Date().toISOString()}"
url: "${getArticleUrl(article.id)}"
---

# ${article.title}

${article.content}
`
}

export const upsertArticlesToBucket = async (articles: Article[], env: Bindings) => {
  for (const newArticle of articles) {
    const fileName = getArticleMarkdownFileName(newArticle.id)
    const newMarkdown = transformArticleToMarkdown(newArticle)

    const oldFile = await env.RAG_BUCKET.get(fileName)
    if (oldFile) {
      const oldMarkdown = await oldFile.text()
      if (oldMarkdown === newMarkdown) {
        console.log(`[R2] Article ${newArticle.id} unchanged, skipping.`)
        continue
      }
    }

    await env.RAG_BUCKET.put(fileName, newMarkdown, {
      customMetadata: {
        type: 'article',
        id: String(newArticle.id),
        title: newArticle.title,
        thumbnail: newArticle.thumbnail,
        url: getArticleUrl(newArticle.id)
      }
    })

    console.log(`[R2] Successfully upserted ${fileName}`)
  }
}

export const deleteArticlesFromBucket = async (articleIds: number[], env: Bindings) => {
  for (const id of articleIds) {
    const fileName = getArticleMarkdownFileName(id)
    await env.RAG_BUCKET.delete(fileName)
    console.log(`[R2] Deleted ${fileName}`)
  }
}
