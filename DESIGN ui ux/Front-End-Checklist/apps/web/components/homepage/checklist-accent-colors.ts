import { CATEGORY_COLORS } from '@repo/config'

const checklistAccentColors: Record<string, string> = {
  'accessibility-checklist': CATEGORY_COLORS.accessibility,
  'launch-checklist': CATEGORY_COLORS.seo,
  'performance-checklist': CATEGORY_COLORS.performance,
  'seo-audit': CATEGORY_COLORS.seo,
  'security-checklist': CATEGORY_COLORS.security
}

const iconAccentColors: Record<string, string> = {
  braces: CATEGORY_COLORS.javascript,
  eye: CATEGORY_COLORS.accessibility,
  gauge: CATEGORY_COLORS.performance,
  rocket: CATEGORY_COLORS.seo,
  search: CATEGORY_COLORS.seo,
  shield: CATEGORY_COLORS.security,
  zap: CATEGORY_COLORS.performance
}

/**
 * Resolve the homepage checklist card accent from the checklist slug or icon.
 *
 * @param slug - Checklist slug from content metadata.
 * @param icon - Checklist icon name from content metadata.
 * @returns Hex color used for checklist card accents.
 */
export function getChecklistAccentColor(slug: string, icon: string): string {
  return checklistAccentColors[slug] ?? iconAccentColors[icon] ?? CATEGORY_COLORS.html
}
