import type { Bindings } from '../env'

// https://github.com/surmon-china/nodepress/blob/main/src/modules/options/options.model.ts
export interface NodePressOptions {
  title: string
  sub_title: string
  description: string
  keywords: Array<string>
  site_url: string
  site_email: string
  statement: string
  friend_links: Array<{ name: string; url: string }>
  app_config: string
}

const transformOptionsToMarkdown = (options: NodePressOptions): string => {
  return [
    `# Site Meta Information`,
    `Title: ${options.title}`,
    `Subtitle: ${options.sub_title}`,
    `Description: ${options.description}`,
    `Keywords: ${(options.keywords || []).join(', ')}`,
    `\n---\n`,
    options.statement || 'No statement provided.'
  ].join('\n')
}

export const upsertOptionsToBucket = async (options: NodePressOptions, env: Bindings) => {
  const markdown = transformOptionsToMarkdown(options)
  await env.RAG_BUCKET.put('site-metainfo.md', markdown, {
    customMetadata: { type: 'site_metainfo' }
  })

  console.log(`[R2] Successfully upserted site-metainfo.md`)
}
