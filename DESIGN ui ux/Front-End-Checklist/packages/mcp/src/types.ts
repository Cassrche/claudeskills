import type { Category, Priority, RuleSource, RuleSourceSummary, Subcategory } from '@repo/types'

/**
 * Summary of a rule for search results (lighter than full Rule)
 */
export interface RuleSummary {
  slug: string
  title: string
  priority: Priority
  categories: Category[]
  primaryCategory: string
}

/**
 * Full rule response with prompts and content
 */
export interface RuleResponse extends RuleSummary {
  description: string
  content: string
  prompts: {
    check: string
    fix: string
    explain: string
    codeReview?: string
  }
  aiContext?: string
  url?: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  estimatedTime?: number
  subcategory?: Subcategory
  relatedRules?: RelatedRule[]
  sources?: RuleSource[]
  sourceSummary?: RuleSourceSummary
}

/**
 * Related rule reference for get_rule responses
 */
export interface RelatedRule {
  slug: string
  title: string
  reason: string
}

/**
 * Category metadata for list_categories tool
 */
export interface CategoryInfo {
  name: Category
  displayName: string
  description: string
  ruleCount: number
  icon: string
}

/**
 * Suggestion for fuzzy matching on errors
 */
export interface Suggestion {
  slug: string
  title: string
  similarity: number
}

/**
 * Search result with pagination
 */
export interface SearchResult {
  rules: RuleSummary[]
  nextCursor?: string
  totalCount: number
}

/**
 * Check rule response
 */
export interface CheckRuleResponse {
  slug: string
  title: string
  checkPrompt: string
  analysis?: string
  fixPrompt?: string
}

/**
 * Fix rule response
 */
export interface FixRuleResponse {
  slug: string
  title: string
  fixPrompt: string
  priority: Priority
  codeContext?: string
}

/**
 * Explain rule response
 */
export interface ExplainRuleResponse {
  slug: string
  title: string
  explainPrompt: string
  categories: Category[]
}

/**
 * Error response with suggestions
 */
export interface ErrorWithSuggestions {
  error: null
  result: null
  suggestions: Suggestion[]
  message: string
}

/**
 * Telemetry event (anonymous)
 */
export interface TelemetryEvent {
  toolName: string
  timestamp: string
}

/**
 * Category display metadata
 */
export const CATEGORY_META: Record<
  Category,
  { displayName: string; description: string; icon: string }
> = {
  html: {
    displayName: 'HTML',
    description: 'Semantic markup and document structure rules',
    icon: 'code'
  },
  css: {
    displayName: 'CSS',
    description: 'Styling, layout, and visual design rules',
    icon: 'palette'
  },
  javascript: {
    displayName: 'JavaScript',
    description: 'Client-side scripting and interactivity rules',
    icon: 'file-code'
  },
  performance: {
    displayName: 'Performance',
    description: 'Loading speed, rendering, and optimization rules',
    icon: 'zap'
  },
  accessibility: {
    displayName: 'Accessibility',
    description: 'Rules for making web content accessible to all users',
    icon: 'accessibility'
  },
  seo: {
    displayName: 'SEO',
    description: 'Search engine optimization and discoverability rules',
    icon: 'search'
  },
  security: {
    displayName: 'Security',
    description: 'Protection against vulnerabilities and attacks',
    icon: 'shield'
  },
  images: {
    displayName: 'Images',
    description: 'Image optimization, formats, and responsive images',
    icon: 'image'
  },
  testing: {
    displayName: 'Testing',
    description: 'Unit, integration, and end-to-end testing rules',
    icon: 'test-tube'
  },
  privacy: {
    displayName: 'Privacy',
    description: 'Consent, tracking, and data rights rules',
    icon: 'lock'
  },
  pwa: {
    displayName: 'PWA',
    description: 'Installability, offline support, and app-like experience rules',
    icon: 'smartphone'
  },
  i18n: {
    displayName: 'Internationalization',
    description: 'Localization, text direction, and translation workflow rules',
    icon: 'languages'
  }
}
