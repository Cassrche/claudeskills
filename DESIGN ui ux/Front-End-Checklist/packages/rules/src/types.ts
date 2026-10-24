export const RULE_CATEGORIES = [
  'html',
  'css',
  'javascript',
  'performance',
  'accessibility',
  'seo',
  'security',
  'images',
  'testing',
  'privacy',
  'pwa',
  'i18n'
] as const

export type FrontendChecklistCategory = (typeof RULE_CATEGORIES)[number]

export type FrontendChecklistPriority = 'critical' | 'high' | 'medium' | 'low'

export const RULE_SUBCATEGORIES = [
  'document-structure',
  'meta',
  'forms',
  'media',
  'navigation',
  'components',
  'semantics',
  'best-practices',
  'performance',
  'security',
  'setup',
  'interaction',
  'metrics',
  'optimization',
  'layout',
  'typography',
  'animation',
  'responsive',
  'loading',
  'design-tokens',
  'keyboard',
  'formats',
  'async',
  'patterns',
  'variables',
  'quality',
  'events',
  'modules',
  'storage',
  'rendering',
  'caching',
  'assets',
  'web-vitals',
  'visual',
  'screen-readers',
  'aria',
  'content',
  'meta-tags',
  'technical',
  'social',
  'local-seo',
  'headers',
  'authentication',
  'data',
  'transport',
  'privacy',
  'unit',
  'integration',
  'e2e',
  'mobile',
  'consent',
  'data-rights',
  'tracking',
  'data-retention',
  'installability',
  'offline',
  'manifest',
  'notifications',
  'text',
  'numbers',
  'rtl',
  'pluralization'
] as const

export type FrontendChecklistSubcategory = (typeof RULE_SUBCATEGORIES)[number]

export interface FrontendChecklistRulePrompts {
  check: string
  fix: string
  explain: string
  codeReview?: string
}

export interface FrontendChecklistRule {
  title: string
  slug: string
  categories: FrontendChecklistCategory[]
  subcategory?: FrontendChecklistSubcategory
  priority: FrontendChecklistPriority
  prompts?: FrontendChecklistRulePrompts
  content: string
  primaryCategory: FrontendChecklistCategory
  url: string
}
