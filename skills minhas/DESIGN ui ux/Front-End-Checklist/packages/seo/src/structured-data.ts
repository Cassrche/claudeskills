import { CATEGORY_LABELS } from '@repo/config'
import type { Rule, StructuredData } from '@repo/types'
import { SEO_CONFIG } from './config'

/**
 * Generate a JSON-LD structured data object.
 * @param type - Schema.org type name.
 * @param data - Additional schema properties.
 * @returns Structured data with base schema fields.
 */
export function generateStructuredData(
  type: string,
  data: Record<string, unknown>
): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': type,
    ...data
  }
}

/**
 * Generate website-level structured data.
 * @returns Schema.org WebSite data.
 */
export function generateWebsiteStructuredData(): StructuredData {
  return generateStructuredData('WebSite', {
    name: SEO_CONFIG.defaultTitle,
    description: SEO_CONFIG.defaultDescription,
    url: SEO_CONFIG.siteUrl,
    author: {
      '@type': 'Organization',
      name: SEO_CONFIG.author
    },
    sameAs: ['https://github.com/thedaviddias/Front-End-Checklist'],
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SEO_CONFIG.siteUrl}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  })
}

/**
 * Generate article structured data for a rule page.
 * @param rule - Rule to describe.
 * @returns Schema.org Article data.
 */
export function generateRuleStructuredData(rule: Rule): StructuredData {
  const about = []
  for (const category of rule.categories) {
    about.push({
      '@type': 'Thing',
      name: CATEGORY_LABELS[category]
    })
  }

  return generateStructuredData('Article', {
    headline: rule.title,
    description: rule.content,
    author: {
      '@type': 'Organization',
      name: SEO_CONFIG.author
    },
    publisher: {
      '@type': 'Organization',
      name: SEO_CONFIG.defaultTitle,
      logo: {
        '@type': 'ImageObject',
        url: `${SEO_CONFIG.siteUrl}/logo.png`
      }
    },
    articleSection: rule.primaryCategory,
    keywords: rule.categories.join(', '),
    about
  })
}

/**
 * Generate breadcrumb structured data.
 * @param items - Ordered breadcrumb items.
 * @returns Schema.org BreadcrumbList data.
 */
export function generateBreadcrumbStructuredData(
  items: Array<{ name: string; url: string }>
): StructuredData {
  const itemListElement = []
  for (const [index, item] of items.entries()) {
    itemListElement.push({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SEO_CONFIG.siteUrl}${item.url}`
    })
  }

  return generateStructuredData('BreadcrumbList', { itemListElement })
}

/**
 * Generate FAQ structured data.
 * @param faqs - FAQ entries.
 * @returns Schema.org FAQPage data.
 */
export function generateFAQStructuredData(
  faqs: Array<{ question: string; answer: string }>
): StructuredData {
  const mainEntity = []
  for (const faq of faqs) {
    mainEntity.push({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    })
  }

  return generateStructuredData('FAQPage', { mainEntity })
}

/**
 * Render a structured data script descriptor.
 * @param structuredData - Schema payload to serialize.
 * @returns Head element descriptor for JSON-LD.
 */
export function renderStructuredData(structuredData: StructuredData) {
  return {
    type: 'script',
    props: {
      key: 'structured-data',
      type: 'application/ld+json',
      dangerouslySetInnerHTML: {
        __html: JSON.stringify(structuredData)
      }
    }
  }
}
