import { CATEGORY_LABELS } from '@repo/config'
import type { Rule } from '@repo/types'
import { SEO_CONFIG } from './config'

export interface SitemapUrl {
  url: string
  lastmod?: string
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

/**
 * Generate sitemap URL entries from the current rules and static routes.
 * @param rules - Rules to include.
 * @returns Sitemap URL descriptors.
 */
export function generateSitemapUrls(rules: Rule[]): SitemapUrl[] {
  const urls: SitemapUrl[] = []
  const now = new Date().toISOString()

  urls.push({
    url: '/',
    lastmod: now,
    changefreq: 'daily',
    priority: 1.0
  })

  for (const category of Object.keys(CATEGORY_LABELS)) {
    urls.push({
      url: `/categories/${category}`,
      lastmod: now,
      changefreq: 'weekly',
      priority: 0.8
    })
  }

  for (const rule of rules) {
    urls.push({
      url: rule.url,
      lastmod: now,
      changefreq: 'monthly',
      priority: 0.6
    })
  }

  const staticPages = ['/about', '/help', '/privacy', '/terms']
  for (const page of staticPages) {
    urls.push({
      url: page,
      lastmod: now,
      changefreq: 'monthly',
      priority: 0.5
    })
  }

  return urls
}

/**
 * Generate XML sitemap markup.
 * @param urls - URL entries to serialize.
 * @returns XML sitemap string.
 */
export function generateSitemapXML(urls: SitemapUrl[]): string {
  const urlEntries: string[] = []
  for (const { url, lastmod, changefreq, priority } of urls) {
    const fullUrl = url.startsWith('http') ? url : `${SEO_CONFIG.siteUrl}${url}`

    urlEntries.push(`  <url>
    <loc>${fullUrl}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    ${changefreq ? `<changefreq>${changefreq}</changefreq>` : ''}
    ${priority ? `<priority>${priority}</priority>` : ''}
  </url>`)
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join('\n')}
</urlset>`
}

/**
 * Generate robots.txt contents.
 * @param options - Optional robots directives.
 * @returns robots.txt content.
 */
export function generateRobotsTxt(options?: {
  disallow?: string[]
  allow?: string[]
  crawlDelay?: number
  sitemapUrl?: string
}): string {
  const {
    disallow = ['/api/*', '/admin/*'],
    allow = ['/'],
    crawlDelay,
    sitemapUrl = `${SEO_CONFIG.siteUrl}/sitemap.xml`
  } = options || {}

  let robotsTxt = 'User-agent: *\n'

  for (const path of allow) {
    robotsTxt += `Allow: ${path}\n`
  }

  for (const path of disallow) {
    robotsTxt += `Disallow: ${path}\n`
  }

  if (crawlDelay) {
    robotsTxt += `Crawl-delay: ${crawlDelay}\n`
  }

  robotsTxt += `\nSitemap: ${sitemapUrl}`

  return robotsTxt
}
