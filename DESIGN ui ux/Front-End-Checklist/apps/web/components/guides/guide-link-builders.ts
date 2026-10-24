import { routeChecklist, routeGuideDetail, routeRule } from '@repo/config'

export interface RelatedLink {
  title: string
  description?: string
  href: string
  meta: string
}

/**
 * Format an ISO date string for guide metadata display.
 *
 * @param value - ISO date string.
 * @returns Human-readable month/day/year text.
 */
export function formatGuideDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(value))
}

/**
 * Convert an internal guide type into the user-facing label.
 *
 * @param type - Guide type value.
 * @returns Display label used in guide UI.
 */
export function formatGuideTypeLabel(type: 'how-to' | 'insight') {
  return type === 'how-to' ? 'Guide' : 'Insight'
}

/**
 * Build a related-link object for a rule reference.
 *
 * @param rule - Rule metadata used to build the link.
 * @returns Guide related-link metadata for a rule.
 */
export function buildGuideRuleLink(rule: {
  title: string
  description?: string
  primaryCategory: string
  slug: string
}): RelatedLink {
  return {
    title: rule.title,
    description: rule.description,
    href: routeRule(rule.primaryCategory, rule.slug),
    meta: 'Rule'
  }
}

/**
 * Build a related-link object for a checklist reference.
 *
 * @param checklist - Checklist metadata used to build the link.
 * @returns Guide related-link metadata for a checklist.
 */
export function buildGuideChecklistLink(checklist: {
  title: string
  description: string
  slug: string
}): RelatedLink {
  return {
    title: checklist.title,
    description: checklist.description,
    href: routeChecklist(checklist.slug),
    meta: 'Checklist'
  }
}

/**
 * Build a related-link object for another guide reference.
 *
 * @param guide - Guide metadata used to build the link.
 * @returns Guide related-link metadata for another guide.
 */
export function buildGuideGuideLink(guide: {
  title: string
  description: string
  slug: string
  type: 'how-to' | 'insight'
}): RelatedLink {
  return {
    title: guide.title,
    description: guide.description,
    href: routeGuideDetail(guide.slug),
    meta: formatGuideTypeLabel(guide.type)
  }
}
