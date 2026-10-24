/** Helpers and constants for the rule detail page. */
import type { RuleResource, RuleSource } from '@repo/types'
import type { allRules } from 'content-collections'

const VALID_RESOURCE_TYPES = new Set<string>([
  'article',
  'book',
  'video',
  'documentation',
  'guide',
  'spec',
  'course',
  'podcast',
  'tool'
])

export const categoryNames: Record<string, string> = {
  html: 'HTML',
  css: 'CSS',
  javascript: 'JavaScript',
  performance: 'Performance',
  accessibility: 'Accessibility',
  seo: 'SEO',
  images: 'Images',
  security: 'Security',
  testing: 'Testing',
  general: 'General'
}

/**
 * Resolve frontmatter relatedRules (slug + optional reason) to full rule data.
 * Prefers same-category matches when a slug appears in multiple categories.
 */
export function resolveRelatedRules(
  lang: string,
  category: string,
  currentSlug: string,
  refs: Array<{ slug: string; reason?: string }> | undefined,
  rules: typeof allRules
): Array<{
  id: string
  title: string
  slug: string
  primaryCategory: string
  description?: string
  reason?: string
}> {
  if (!refs || refs.length === 0) return []

  const result: Array<{
    id: string
    title: string
    slug: string
    primaryCategory: string
    description?: string
    reason?: string
  }> = []
  const seenIds = new Set<string>()

  for (const ref of refs) {
    if (ref.slug === currentSlug) continue
    const candidates = rules.filter(r => r.language === lang && r.slug === ref.slug)
    const rule = candidates.find(r => r.primaryCategory === category) ?? candidates[0]
    if (rule && !seenIds.has(rule.id)) {
      seenIds.add(rule.id)
      result.push({
        id: rule.id,
        title: rule.title,
        slug: rule.slug,
        primaryCategory: rule.primaryCategory,
        description: rule.description,
        reason: ref.reason
      })
    }
  }
  return result
}

/** Check whether a content-collections resource matches the supported rule resource schema. */
export function isRuleResource(resource: {
  name: string
  url: string
  type: string
  author?: string
  description?: string
}): resource is RuleResource {
  return VALID_RESOURCE_TYPES.has(resource.type)
}

/** Check whether a frontmatter source has the minimum shape to render in the UI. */
export function isRuleSource(source: Partial<RuleSource>): source is RuleSource {
  return (
    typeof source.id === 'string' &&
    typeof source.title === 'string' &&
    typeof source.url === 'string' &&
    typeof source.type === 'string' &&
    typeof source.role === 'string' &&
    typeof source.authority === 'string'
  )
}
