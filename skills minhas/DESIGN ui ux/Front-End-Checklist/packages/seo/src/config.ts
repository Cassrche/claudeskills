import { APP_DESCRIPTION, APP_NAME, APP_URL } from '@repo/config'

/**
 * Shared SEO defaults for meta tags, structured data, and sitemap generation.
 */
export const SEO_CONFIG = {
  defaultTitle: APP_NAME,
  titleTemplate: `%s | ${APP_NAME}`,
  defaultDescription: APP_DESCRIPTION,
  siteUrl: APP_URL,
  defaultImage: `${APP_URL}/og-image.png`,
  twitterHandle: '@frontendcheck',
  author: 'Front-End Checklist Team',
  keywords: [
    'frontend',
    'checklist',
    'web development',
    'html',
    'css',
    'javascript',
    'performance',
    'accessibility',
    'seo',
    'security',
    'best practices'
  ]
}
