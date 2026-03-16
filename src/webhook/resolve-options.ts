import { AUTHOR_INFO_MARKDOWN_FILE_NAME, SITE_INFO_MARKDOWN_FILE_NAME } from '../config'

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

const transformOptionsToAuthorInfo = (options: NodePressOptions): string => {
  try {
    const appConfig = JSON.parse(options.app_config || '{}')
    const zh = appConfig.ABOUT_BIOGRAPHY_ZH || ''
    const en = appConfig.ABOUT_BIOGRAPHY_EN || ''
    return [zh, en].filter(Boolean).join('\n')
  } catch {
    return ''
  }
}

const transformOptionsToSiteInfo = (options: NodePressOptions): string => {
  return [
    `## Site Meta Information`,
    `Title: ${options.title}`,
    `Subtitle: ${options.sub_title}`,
    `Description: ${options.description}`,
    `Keywords: ${(options.keywords || []).join(', ')}`,
    ``,
    options.statement || 'No statement provided.'
  ].join('\n')
}

export const upsertOptionsToBucket = async (options: NodePressOptions, env: Env) => {
  const authorInfo = transformOptionsToAuthorInfo(options)
  const siteInfo = transformOptionsToSiteInfo(options)

  await Promise.all([
    env.RAG_BUCKET.put(AUTHOR_INFO_MARKDOWN_FILE_NAME, authorInfo, {
      httpMetadata: { contentType: 'text/markdown' },
      customMetadata: { type: 'static_info' }
    }),
    env.RAG_BUCKET.put(SITE_INFO_MARKDOWN_FILE_NAME, siteInfo, {
      httpMetadata: { contentType: 'text/markdown' },
      customMetadata: { type: 'static_info' }
    })
  ])

  console.log(
    `[Webhook R2] Successfully upserted ${AUTHOR_INFO_MARKDOWN_FILE_NAME}, ${SITE_INFO_MARKDOWN_FILE_NAME}`
  )
}
