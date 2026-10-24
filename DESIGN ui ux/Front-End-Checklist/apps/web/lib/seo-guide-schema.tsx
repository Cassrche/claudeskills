import type { ReactNode } from 'react'
import { siteConfig } from './seo-metadata'

/**
 * Generate structured data for an individual guide article.
 *
 * @param guide - Guide metadata used to build the schema.
 * @returns A schema.org Article object.
 */
export function generateGuideSchema(guide: {
  title: string
  description: string
  slug: string
  publishedAt: string
  updatedAt: string
  coverImage: string
  category: string
  type: 'how-to' | 'insight'
  tags: string[]
  author: {
    name: string
    url?: string
  }
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.description,
    image: guide.coverImage.startsWith('http')
      ? [guide.coverImage]
      : [`${siteConfig.url}${guide.coverImage}`],
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt,
    articleSection: guide.category,
    keywords: guide.tags.join(', '),
    mainEntityOfPage: `${siteConfig.url}/guides/${guide.slug}`,
    author: {
      '@type': 'Person',
      name: guide.author.name,
      url: guide.author.url
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
      logo: {
        '@type': 'ImageObject',
        url: `${siteConfig.url}/logo.png`
      }
    },
    isAccessibleForFree: true,
    genre: guide.type
  }
}

interface JsonLdProps {
  data: Record<string, unknown>
}

/**
 * Render a JSON-LD script tag.
 *
 * @param props - JSON-LD payload props.
 * @returns A script element containing serialized schema markup.
 */
export function JsonLd({ data }: JsonLdProps): ReactNode {
  return <script type="application/ld+json">{JSON.stringify(data)}</script>
}
