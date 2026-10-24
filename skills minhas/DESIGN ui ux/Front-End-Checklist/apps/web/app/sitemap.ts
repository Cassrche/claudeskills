import { SITE_URL } from '@repo/config'
import { allGuides, allRules } from 'content-collections'
import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  // Static pages
  const staticPages = ['', '/rules', '/mcp', '/guides']

  // Get unique categories
  const categories = [...new Set(allRules.map(rule => rule.primaryCategory))]

  // Generate sitemap entries
  const entries: MetadataRoute.Sitemap = []

  for (const page of staticPages) {
    entries.push({
      url: `${SITE_URL}${page}`,
      lastModified: new Date(),
      changeFrequency: page === '' ? 'weekly' : 'daily',
      priority: page === '' ? 1 : 0.8,
      alternates: {
        languages: {
          en: `${SITE_URL}${page}`
        }
      }
    })
  }

  for (const category of categories) {
    entries.push({
      url: `${SITE_URL}/rules/${category}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
      alternates: {
        languages: {
          en: `${SITE_URL}/rules/${category}`
        }
      }
    })
  }

  // Add rule pages
  for (const rule of allRules) {
    entries.push({
      url: `${SITE_URL}/rules/${rule.primaryCategory}/${rule.slug}`,
      lastModified: rule.lastUpdated ? new Date(rule.lastUpdated) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
      alternates: {
        languages: {
          en: `${SITE_URL}/rules/${rule.primaryCategory}/${rule.slug}`
        }
      }
    })
  }

  for (const guide of allGuides) {
    entries.push({
      url: `${SITE_URL}/guides/${guide.slug}`,
      lastModified: new Date(guide.updatedAt),
      changeFrequency: 'weekly',
      priority: 0.7,
      alternates: {
        languages: {
          en: `${SITE_URL}/guides/${guide.slug}`
        }
      }
    })
  }

  return entries
}
