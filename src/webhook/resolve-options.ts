import { SITE_METAINFO_MARKDOWN_FILE_NAME } from '../config'

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
  let authorBiography = ''
  try {
    const appConfig = JSON.parse(options.app_config || '{}')
    authorBiography = appConfig.ABOUT_BIOGRAPHY_ZH || ''
  } catch {}

  return [
    `## Site Meta Information`,
    `Title: ${options.title}`,
    `Subtitle: ${options.sub_title}`,
    `Description: ${options.description}`,
    `Keywords: ${(options.keywords || []).join(', ')}`,
    ``,
    `## About the Author`,
    authorBiography,
    ``,
    options.statement || 'No statement provided.'
  ].join('\n')
}

export const upsertOptionsToBucket = async (options: NodePressOptions, env: Env) => {
  const markdown = transformOptionsToMarkdown(options)
  await env.RAG_BUCKET.put(SITE_METAINFO_MARKDOWN_FILE_NAME, markdown, {
    httpMetadata: { contentType: 'text/markdown' },
    customMetadata: { type: 'site_metainfo' }
  })

  console.log(`[Webhook R2] Successfully upserted ${SITE_METAINFO_MARKDOWN_FILE_NAME}`)
}
