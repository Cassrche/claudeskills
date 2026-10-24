// Rule-related types
export type Priority = 'critical' | 'high' | 'medium' | 'low'

export const CATEGORIES = [
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

export type Category = (typeof CATEGORIES)[number]

export type ChecklistFramework = 'vite' | 'nextjs' | 'astro' | 'sveltekit' | 'react'

export const SUBCATEGORY_MAP = {
  html: [
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
    'optimization'
  ],
  css: [
    'layout',
    'typography',
    'animation',
    'responsive',
    'loading',
    'optimization',
    'design-tokens',
    'best-practices',
    'performance',
    'keyboard',
    'formats'
  ],
  javascript: [
    'async',
    'loading',
    'optimization',
    'best-practices',
    'performance',
    'patterns',
    'variables',
    'quality',
    'security',
    'events',
    'modules',
    'storage'
  ],
  performance: ['loading', 'rendering', 'caching', 'assets', 'metrics', 'web-vitals'],
  accessibility: [
    'visual',
    'keyboard',
    'screen-readers',
    'aria',
    'interaction',
    'components',
    'forms',
    'media',
    'content',
    'document-structure',
    'animation'
  ],
  seo: ['meta-tags', 'content', 'technical', 'social', 'local-seo'],
  security: ['headers', 'authentication', 'data', 'transport', 'privacy', 'forms'],
  images: ['formats', 'optimization', 'responsive', 'loading', 'accessibility'],
  testing: ['unit', 'integration', 'e2e', 'visual', 'mobile', 'performance', 'best-practices'],
  privacy: ['consent', 'data-rights', 'tracking', 'data-retention'],
  pwa: ['installability', 'offline', 'manifest', 'storage', 'notifications'],
  i18n: ['text', 'numbers', 'rtl', 'pluralization']
} as const satisfies Record<Category, readonly string[]>

export type SubcategoryMap = {
  [K in keyof typeof SUBCATEGORY_MAP]: (typeof SUBCATEGORY_MAP)[K][number]
}

// Union type of all possible subcategories
export type Subcategory = SubcategoryMap[keyof SubcategoryMap]

export const SUBCATEGORIES = Array.from(
  new Set(Object.values(SUBCATEGORY_MAP).flat())
) as Subcategory[]

export interface RulePrompts {
  check: string
  fix: string
  explain: string
  codeReview?: string
}

/**
 * Related rule reference for frontmatter
 */
export interface RelatedRuleRef {
  slug: string
  reason: string
}

export type RuleSourceAuthority = 'primary' | 'secondary'

export type RuleSourceRole =
  | 'standard'
  | 'reference'
  | 'implementation'
  | 'compatibility'
  | 'regulation'
  | 'search'
  | 'research'

export interface RuleSource {
  id: string
  title: string
  url: string
  type: string
  role: RuleSourceRole
  authority: RuleSourceAuthority
}

export interface RuleSourceSummary {
  sourceCount: number
  primarySourceCount: number
  sourceRoleCount: number
}

export interface Rule {
  title: string
  slug: string
  categories: Category[]
  subcategory?: Subcategory // Optional subcategory within primary category
  priority: Priority
  prompts?: RulePrompts
  relatedRules?: RelatedRuleRef[] // Related rules defined in frontmatter
  aiContext?: string // One-sentence context for when this rule applies.
  tools?: RuleTool[]
  sources?: RuleSource[]
  sourceSummary?: RuleSourceSummary
  resources?: RuleResource[]
  npmPackages?: NpmPackage[] // Popular, maintained npm packages relevant to this rule
  content: string
  mdx?: any // MDX compiled content
  primaryCategory: string
  url: string
}

/**
 * Tool reference in rule frontmatter
 */
export interface RuleTool {
  name: string
  url: string | null
}

/**
 * Resource types for extended learning materials
 */
export type ResourceType =
  | 'article'
  | 'book'
  | 'video'
  | 'documentation'
  | 'guide'
  | 'spec'
  | 'course'
  | 'podcast'
  | 'tool'

/**
 * Extended resource for rules (articles, books, videos, etc.)
 * Optional image and siteName are populated from Open Graph metadata at build time.
 */
export interface RuleResource {
  name: string
  url: string
  type: ResourceType
  author?: string
  description?: string
  /** OG/twitter image URL when available (for Notion-style preview cards) */
  image?: string
  /** Site name from Open Graph (e.g. "MDN", "web.dev") */
  siteName?: string
}

/**
 * Enriched npm package reference for rules.
 * Metadata is fetched from the npm registry at build time.
 */
export interface NpmPackage {
  name: string
  description: string
  version: string
  weeklyDownloads: number
  lastPublish: string // ISO date string
  url: string // https://www.npmjs.com/package/{name}
  repository?: string
}

// User progress and preferences
export interface UserProgress {
  ruleId: string
  completed: boolean
  completedAt?: Date
  notes?: string
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  locale: string
  selectedCategories: Category[]
  selectedPriorities: Priority[]
  showCompleted: boolean
  sortBy: 'priority' | 'category' | 'alphabetical'
  sortOrder: 'asc' | 'desc'
}

// Export formats
export type ExportFormat = 'json' | 'csv' | 'pdf' | 'markdown' | 'html'

export interface ExportOptions {
  format: ExportFormat
  includeCompleted: boolean
  includeNotes: boolean
  categories?: Category[]
  priorities?: Priority[]
}

export interface ExportData {
  metadata: {
    exportedAt: Date
    version: string
    totalRules: number
    completedRules: number
    progress: number
  }
  rules: Rule[]
  progress: UserProgress[]
  preferences?: UserPreferences
}

// Search and filtering
export interface SearchResult {
  rule: Rule
  score: number
  matches: {
    field: string
    indices: Array<[number, number]>
  }[]
}

export interface FilterOptions {
  categories?: Category[]
  priorities?: Priority[]
  completed?: boolean
  query?: string
}

export interface SortOptions {
  field: 'title' | 'priority' | 'category' | 'completion'
  order: 'asc' | 'desc'
}

// Analytics events
export interface AnalyticsEvent {
  category: string
  action: string
  label?: string
  value?: number
}

export interface PageView {
  path: string
  title: string
  referrer?: string
}

// Feature flags
export interface FeatureFlag {
  key: string
  enabled: boolean
  variant?: string
  metadata?: Record<string, any>
}

// Configuration
export interface AppConfig {
  apiUrl?: string
  analyticsId?: string
  sentryDsn?: string
  features: Record<string, boolean>
  defaultLocale: string
  supportedLocales: string[]
}

// Storage types
export interface StorageItem<T = any> {
  key: string
  value: T
  expiresAt?: Date
  version?: string
}

// Error tracking
export interface ErrorContext {
  user?: string
  tags: Record<string, string>
  extra: Record<string, any>
  fingerprint?: string[]
}

// Performance metrics
export interface PerformanceMetric {
  name: string
  value: number
  unit: 'ms' | 'bytes' | 'count'
  timestamp: Date
}

// Content collections integration
export interface ContentMeta {
  path: string
  fileName: string
  directory: string
  extension: string
  lastModified?: Date
}

// TanStack Query types
export interface QueryOptions {
  staleTime?: number
  cacheTime?: number
  refetchOnWindowFocus?: boolean
  refetchOnMount?: boolean
  retry?: number | boolean
  enabled?: boolean
}

export interface MutationOptions<T = any, E = Error> {
  onSuccess?: (data: T) => void
  onError?: (error: E) => void
  onSettled?: () => void
}

// Virtualization types
export interface VirtualItem {
  index: number
  start: number
  end: number
  size: number
  key: string | number
}

export interface VirtualOptions {
  count: number
  getScrollElement: () => HTMLElement | null
  estimateSize: (index: number) => number
  overscan?: number
  horizontal?: boolean
}

// i18n types
export interface Translation {
  key: string
  value: string
  namespace?: string
}

export interface Locale {
  code: string
  name: string
  direction: 'ltr' | 'rtl'
  translations: Record<string, Translation>
}

// SEO types
export interface MetaTags {
  title?: string
  description?: string
  keywords?: string[]
  author?: string
  canonical?: string
  robots?: string
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  ogUrl?: string
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player'
  twitterSite?: string
  twitterCreator?: string
}

export interface StructuredData {
  '@context': string
  '@type': string
  [key: string]: any
}

// Curated Checklist types
export interface CuratedChecklist {
  id: string
  slug: string
  title: string
  description: string
  icon: string
  rules: string[] // Array of rule references (category/slug format)
  estimatedTime?: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  order?: number
  featured?: boolean
  language: string
  url: string
  mdx?: any // MDX compiled content
}

// User-created checklist types (for localStorage)
export interface UserChecklist {
  id: string // UUID
  publicId?: string | null // When set, list is shareable via /list/[publicId]
  name: string
  description?: string
  framework?: ChecklistFramework
  ruleIds: string[] // Rule IDs
  createdAt: string // ISO date
  updatedAt: string // ISO date
  color?: string // Optional theme color
}

export type RuleFeedbackValue = 'helpful' | 'not_helpful'

export interface RuleFeedbackRecord {
  ruleId: string
  userId: string
  value: RuleFeedbackValue
  createdAt: string
  updatedAt: string
}

export interface RuleFeedbackSummary {
  totalResponses: number
  helpfulCount: number
  notHelpfulCount: number
  helpfulRatio: number
}

export type RuleCredibilityReason =
  | 'insufficient_volume'
  | 'low_confidence'
  | 'mixed_signal'
  | 'eligible'

export interface RuleCredibilityDecision {
  publicEligible: boolean
  reason: RuleCredibilityReason
}

export interface RuleFeedbackResponse {
  currentUserFeedback: RuleFeedbackValue | null
  summary: RuleFeedbackSummary
  credibility: RuleCredibilityDecision
}

export interface RuleFeedbackMutationInput {
  value: RuleFeedbackValue
}

// GitHub Sponsors types
export type SponsorTierLevel = 'diamond' | 'gold' | 'silver' | 'bronze' | 'backer'

export interface SponsorTier {
  id: string
  name: string
  level: SponsorTierLevel
  monthlyPriceInDollars: number
  description: string
  benefits: string[]
}

export type SponsorSource = 'github' | 'opencollective'

export interface Sponsor {
  login: string
  name: string | null
  avatarUrl: string
  tier: SponsorTier
  websiteUrl?: string
  createdAt: string
  source?: SponsorSource
  totalDonations?: number // Total amount donated in dollars (for sizing)
}

export interface SponsorsData {
  tiers: SponsorTier[]
  sponsors: Sponsor[]
  totalCount: number
  monthlyRevenue: number
}

// Pre-defined sponsor tiers for GitHub Sponsors setup
export const SPONSOR_TIERS: SponsorTier[] = [
  {
    id: 'diamond',
    name: 'Diamond',
    level: 'diamond',
    monthlyPriceInDollars: 2000,
    description: 'For companies that want maximum visibility and direct access.',
    benefits: [
      'Large logo on homepage',
      'Featured on sponsors page',
      'README acknowledgment',
      'Direct support access',
      'Priority feature requests'
    ]
  },
  {
    id: 'gold',
    name: 'Gold',
    level: 'gold',
    monthlyPriceInDollars: 500,
    description: 'Great visibility for companies supporting open source.',
    benefits: ['Medium logo on homepage', 'Logo on sponsors page', 'README acknowledgment']
  },
  {
    id: 'silver',
    name: 'Silver',
    level: 'silver',
    monthlyPriceInDollars: 200,
    description: 'Show your support with prominent recognition.',
    benefits: ['Logo on sponsors page', 'SPONSORS.md mention']
  },
  {
    id: 'bronze',
    name: 'Bronze',
    level: 'bronze',
    monthlyPriceInDollars: 100,
    description: 'Support the project with public recognition.',
    benefits: ['Small logo on sponsors page']
  },
  {
    id: 'backer',
    name: 'Backer',
    level: 'backer',
    monthlyPriceInDollars: 10,
    description: 'Thank you for your support!',
    benefits: ['Avatar on sponsors page', 'Listed in backers']
  }
]

// Community Mentions types
export type MentionType = 'article' | 'tweet' | 'youtube'

export interface BaseMention {
  id: string
  type: MentionType
  url: string
  date: string // ISO date string
  featured: boolean
}

export interface ArticleMention extends BaseMention {
  type: 'article'
  title: string
  source: string // Publication name (e.g., "Smashing Magazine")
  author?: string
  excerpt?: string
  ogImage?: string // Open Graph image URL for link preview
  favicon?: string // Site favicon URL
}

export interface TweetMention extends BaseMention {
  type: 'tweet'
  tweetId: string // X post ID (e.g., "1628832338187636740")
  author?: string
  authorUrl?: string
  avatarUrl?: string
  handle?: string // X handle without @
  content?: string
  mediaUrl?: string
  mediaAlt?: string
  likes?: number
}

export interface YouTubeMention extends BaseMention {
  type: 'youtube'
  videoId: string // YouTube video ID for embed (e.g., "dQw4w9WgXcQ")
  title: string
  channel: string
  views?: number
  thumbnail?: string // Custom thumbnail, defaults to YouTube's
}

export type Mention = ArticleMention | TweetMention | YouTubeMention

export interface MentionsData {
  mentions: Mention[]
}

// Re-export commonly used types
export type { Rule as ChecklistRule, UserPreferences as Preferences, UserProgress as Progress }
