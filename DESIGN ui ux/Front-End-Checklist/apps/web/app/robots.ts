import { SITE_URL } from '@repo/config'
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/_next/', '/static/']
      }
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL
    // Note: llms.txt is available at /llms.txt and /llms-full.txt
    // These files provide LLM-friendly content about this checklist
  }
}
