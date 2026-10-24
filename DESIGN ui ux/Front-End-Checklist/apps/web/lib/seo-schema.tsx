import { siteConfig } from './seo-metadata'

export { generateCategorySchema, generateChecklistSchema } from './seo-list-schemas'

/**
 * Generate organization structured data for the site.
 *
 * @returns A schema.org Organization object.
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo.png`,
    sameAs: [siteConfig.links.github, siteConfig.links.twitter]
  }
}

/**
 * Generate website structured data including the site search action.
 *
 * @returns A schema.org WebSite object.
 */
export function generateWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: siteConfig.url,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteConfig.url}/search?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  }
}

/**
 * Generate breadcrumb structured data for a page.
 *
 * @param items - Ordered breadcrumb items with names and URLs.
 * @returns A schema.org BreadcrumbList object.
 */
export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${siteConfig.url}${item.url}`
    }))
  }
}

/**
 * Generate HowTo structured data for an individual rule.
 *
 * @param rule - Rule metadata used to build the schema.
 * @returns A schema.org HowTo object.
 */
export function generateRuleSchema(rule: {
  title: string
  description: string
  slug: string
  primaryCategory: string
  difficulty?: string
  estimatedTime?: number
  tools?: string[]
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: rule.title,
    description: rule.description,
    url: `${siteConfig.url}/rules/${rule.primaryCategory}/${rule.slug}`,
    totalTime: rule.estimatedTime ? `PT${rule.estimatedTime}M` : undefined,
    tool: rule.tools?.map(tool => ({
      '@type': 'HowToTool',
      name: tool
    })),
    step: [
      {
        '@type': 'HowToStep',
        name: 'Review the rule',
        text: 'Understand the best practice and why it matters.'
      },
      {
        '@type': 'HowToStep',
        name: 'Implement in your project',
        text: 'Follow the implementation guide and code examples.'
      },
      {
        '@type': 'HowToStep',
        name: 'Test and validate',
        text: 'Use the provided testing strategies to verify compliance.'
      }
    ]
  }
}
