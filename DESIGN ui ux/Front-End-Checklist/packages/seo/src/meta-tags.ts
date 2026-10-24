import { CATEGORY_LABELS } from '@repo/config'
import type { Category, MetaTags, Rule } from '@repo/types'
import { SEO_CONFIG } from './config'

/**
 * Generate meta tags for a generic page.
 * @param options - Page metadata inputs.
 * @returns Normalized meta tag values for rendering.
 */
export function generateMetaTags(options: {
  title?: string
  description?: string
  keywords?: string[]
  image?: string
  url?: string
  type?: 'website' | 'article'
  author?: string
  publishedTime?: string
  modifiedTime?: string
  section?: string
  tags?: string[]
  locale?: string
  alternates?: Array<{ locale: string; url: string }>
}): MetaTags {
  const {
    title,
    description = SEO_CONFIG.defaultDescription,
    keywords = [],
    image = SEO_CONFIG.defaultImage,
    url,
    author = SEO_CONFIG.author,
    tags = []
  } = options

  const fullTitle = title ? `${title} | ${SEO_CONFIG.defaultTitle}` : SEO_CONFIG.defaultTitle
  const fullUrl = url ? `${SEO_CONFIG.siteUrl}${url}` : SEO_CONFIG.siteUrl
  const allKeywords = [...SEO_CONFIG.keywords, ...keywords, ...tags]

  return {
    title: fullTitle,
    description,
    keywords: allKeywords,
    author,
    canonical: fullUrl,
    robots: 'index,follow',
    ogTitle: title || SEO_CONFIG.defaultTitle,
    ogDescription: description,
    ogImage: image,
    ogUrl: fullUrl,
    twitterCard: 'summary_large_image',
    twitterSite: SEO_CONFIG.twitterHandle,
    twitterCreator: SEO_CONFIG.twitterHandle
  }
}

/**
 * Generate meta tags for a rule page.
 * @param rule - Rule to describe.
 * @returns Meta tags tailored to a rule detail page.
 */
export function generateRuleMetaTags(rule: Rule): MetaTags {
  return generateMetaTags({
    title: rule.title,
    description: `${rule.content.slice(0, 150)}...`,
    keywords: [...rule.categories, rule.priority],
    url: rule.url,
    type: 'article',
    section: rule.primaryCategory,
    tags: rule.categories
  })
}

/**
 * Generate meta tags for a category landing page.
 * @param category - Category slug.
 * @returns Meta tags tailored to the category page.
 */
export function generateCategoryMetaTags(category: Category): MetaTags {
  const categoryLabel = CATEGORY_LABELS[category]
  return generateMetaTags({
    title: `${categoryLabel} Rules`,
    description: `Complete checklist of ${categoryLabel.toLowerCase()} best practices and rules for front-end development.`,
    keywords: [category, 'rules', 'checklist', 'best practices'],
    url: `/categories/${category}`,
    section: category
  })
}

/**
 * Render generic meta tag descriptors for a head manager.
 * @param metaTags - Normalized meta tag values.
 * @returns Element descriptor list for head rendering.
 */
export function renderMetaTags(metaTags: MetaTags) {
  const tags: Array<{ type: string; props: Record<string, unknown> }> = []

  if (metaTags.title) {
    tags.push({ type: 'title', props: { key: 'title', children: metaTags.title } })
  }

  if (metaTags.description) {
    tags.push({
      type: 'meta',
      props: { key: 'description', name: 'description', content: metaTags.description }
    })
  }

  if (metaTags.keywords && metaTags.keywords.length > 0) {
    tags.push({
      type: 'meta',
      props: { key: 'keywords', name: 'keywords', content: metaTags.keywords.join(', ') }
    })
  }

  if (metaTags.author) {
    tags.push({
      type: 'meta',
      props: { key: 'author', name: 'author', content: metaTags.author }
    })
  }

  if (metaTags.canonical) {
    tags.push({
      type: 'link',
      props: { key: 'canonical', rel: 'canonical', href: metaTags.canonical }
    })
  }

  if (metaTags.robots) {
    tags.push({
      type: 'meta',
      props: { key: 'robots', name: 'robots', content: metaTags.robots }
    })
  }

  if (metaTags.ogTitle) {
    tags.push({
      type: 'meta',
      props: { key: 'og:title', property: 'og:title', content: metaTags.ogTitle }
    })
  }

  if (metaTags.ogDescription) {
    tags.push({
      type: 'meta',
      props: { key: 'og:description', property: 'og:description', content: metaTags.ogDescription }
    })
  }

  if (metaTags.ogImage) {
    tags.push({
      type: 'meta',
      props: { key: 'og:image', property: 'og:image', content: metaTags.ogImage }
    })
  }

  if (metaTags.ogUrl) {
    tags.push({
      type: 'meta',
      props: { key: 'og:url', property: 'og:url', content: metaTags.ogUrl }
    })
  }

  if (metaTags.twitterCard) {
    tags.push({
      type: 'meta',
      props: { key: 'twitter:card', name: 'twitter:card', content: metaTags.twitterCard }
    })
  }

  if (metaTags.twitterSite) {
    tags.push({
      type: 'meta',
      props: { key: 'twitter:site', name: 'twitter:site', content: metaTags.twitterSite }
    })
  }

  if (metaTags.twitterCreator) {
    tags.push({
      type: 'meta',
      props: { key: 'twitter:creator', name: 'twitter:creator', content: metaTags.twitterCreator }
    })
  }

  return tags
}

/**
 * Validate a meta tag set against basic SEO heuristics.
 * @param metaTags - Meta tags to validate.
 * @returns Validation result with warnings and errors.
 */
export function validateMetaTags(metaTags: MetaTags): {
  isValid: boolean
  warnings: string[]
  errors: string[]
} {
  const warnings: string[] = []
  const errors: string[] = []

  if (!metaTags.title) {
    errors.push('Title is required')
  } else if (metaTags.title.length > 60) {
    warnings.push('Title should be under 60 characters')
  }

  if (!metaTags.description) {
    errors.push('Description is required')
  } else if (metaTags.description.length > 160) {
    warnings.push('Description should be under 160 characters')
  } else if (metaTags.description.length < 120) {
    warnings.push('Description should be at least 120 characters')
  }

  if (metaTags.keywords && metaTags.keywords.length > 10) {
    warnings.push('Too many keywords, consider reducing to 5-10')
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors
  }
}
