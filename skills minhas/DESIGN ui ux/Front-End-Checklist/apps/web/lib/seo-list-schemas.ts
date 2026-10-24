import { siteConfig } from './seo-metadata'

/**
 * Generate collection structured data for a rule category page.
 *
 * @param category - Category metadata and contained rules.
 * @returns A schema.org CollectionPage object.
 */
export function generateCategorySchema(category: {
  name: string
  description: string
  rules: { title: string; slug: string; primaryCategory: string }[]
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${category.name} Rules - ${siteConfig.name}`,
    description: category.description,
    url: `${siteConfig.url}/rules/${category.name.toLowerCase()}`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: category.rules.length,
      itemListElement: category.rules.map((rule, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Article',
          name: rule.title,
          url: `${siteConfig.url}/rules/${rule.primaryCategory}/${rule.slug}`
        }
      }))
    }
  }
}

/**
 * Generate structured data for a curated checklist page.
 *
 * @param checklist - Checklist metadata and included rules.
 * @returns A schema.org ItemList object.
 */
export function generateChecklistSchema(checklist: {
  title: string
  description: string
  slug: string
  rules: { title: string; slug: string; primaryCategory: string }[]
  estimatedTime?: string
  difficulty?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: checklist.title,
    description: checklist.description,
    url: `${siteConfig.url}/checklists/${checklist.slug}`,
    numberOfItems: checklist.rules.length,
    itemListElement: checklist.rules.map((rule, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'HowTo',
        name: rule.title,
        url: `${siteConfig.url}/rules/${rule.primaryCategory}/${rule.slug}`
      }
    }))
  }
}
