import { CHECKLIST_FRAMEWORKS } from '@repo/config'
import { z } from 'zod'

// Rule schemas
export const prioritySchema = z.enum(['critical', 'high', 'medium', 'low'])

export const categorySchema = z.enum([
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
])

export const rulePromptsSchema = z.object({
  check: z.string().min(1),
  fix: z.string().min(1),
  explain: z.string().min(1),
  codeReview: z.string().optional()
})

export const ruleSourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  type: z.string().min(1),
  role: z.enum([
    'standard',
    'reference',
    'implementation',
    'compatibility',
    'regulation',
    'search',
    'research'
  ]),
  authority: z.enum(['primary', 'secondary'])
})

export const ruleSourceSummarySchema = z.object({
  sourceCount: z.number().int().min(0),
  primarySourceCount: z.number().int().min(0),
  sourceRoleCount: z.number().int().min(0)
})

export const ruleSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(100),
  categories: z.array(categorySchema).min(1),
  priority: prioritySchema,
  prompts: rulePromptsSchema.optional(),
  sources: z.array(ruleSourceSchema).optional(),
  sourceSummary: ruleSourceSummarySchema.optional(),
  content: z.string().min(1),
  mdx: z.any().optional(),
  primaryCategory: z.string(),
  url: z.string()
})

// User schemas
export const userProgressSchema = z.object({
  ruleId: z.string().min(1),
  completed: z.boolean(),
  completedAt: z.date().optional(),
  notes: z.string().max(1000).optional()
})

export const userPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  locale: z.string().min(2).max(5),
  selectedCategories: z.array(categorySchema),
  selectedPriorities: z.array(prioritySchema),
  showCompleted: z.boolean(),
  sortBy: z.enum(['priority', 'category', 'alphabetical']),
  sortOrder: z.enum(['asc', 'desc'])
})

export const checklistFrameworkSchema = z.enum(CHECKLIST_FRAMEWORKS)

// Export schemas
export const exportFormatSchema = z.enum(['json', 'csv', 'pdf', 'markdown', 'html'])

export const exportOptionsSchema = z.object({
  format: exportFormatSchema,
  includeCompleted: z.boolean(),
  includeNotes: z.boolean(),
  categories: z.array(categorySchema).optional(),
  priorities: z.array(prioritySchema).optional()
})

export const exportDataSchema = z.object({
  metadata: z.object({
    exportedAt: z.date(),
    version: z.string(),
    totalRules: z.number().int().min(0),
    completedRules: z.number().int().min(0),
    progress: z.number().min(0).max(100)
  }),
  rules: z.array(ruleSchema),
  progress: z.array(userProgressSchema),
  preferences: userPreferencesSchema.optional()
})

// Search and filter schemas
export const filterOptionsSchema = z.object({
  categories: z.array(categorySchema).optional(),
  priorities: z.array(prioritySchema).optional(),
  completed: z.boolean().optional(),
  query: z.string().min(1).max(100).optional()
})

export const sortOptionsSchema = z.object({
  field: z.enum(['title', 'priority', 'category', 'completion']),
  order: z.enum(['asc', 'desc'])
})

// Analytics schemas
export const analyticsEventSchema = z.object({
  category: z.string().min(1).max(50),
  action: z.string().min(1).max(50),
  label: z.string().max(100).optional(),
  value: z.number().optional()
})

export const pageViewSchema = z.object({
  path: z.string().min(1),
  title: z.string().min(1),
  referrer: z.string().optional()
})

// Feature flag schemas
export const featureFlagSchema = z.object({
  key: z.string().min(1).max(50),
  enabled: z.boolean(),
  variant: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.any()).optional()
})

// Configuration schemas
export const appConfigSchema = z.object({
  apiUrl: z.string().url().optional(),
  analyticsId: z.string().optional(),
  sentryDsn: z.string().optional(),
  features: z.record(z.string(), z.boolean()),
  defaultLocale: z.string().min(2).max(5),
  supportedLocales: z.array(z.string().min(2).max(5))
})

// Storage schemas
export const storageItemSchema = z.object({
  key: z.string().min(1),
  value: z.any(),
  expiresAt: z.date().optional(),
  version: z.string().optional()
})

// Error tracking schemas
export const errorContextSchema = z.object({
  user: z.string().optional(),
  tags: z.record(z.string(), z.string()),
  extra: z.record(z.string(), z.any()),
  fingerprint: z.array(z.string()).optional()
})

// Performance schemas
export const performanceMetricSchema = z.object({
  name: z.string().min(1),
  value: z.number(),
  unit: z.enum(['ms', 'bytes', 'count']),
  timestamp: z.date()
})

// Content meta schemas
export const contentMetaSchema = z.object({
  path: z.string(),
  fileName: z.string(),
  directory: z.string(),
  extension: z.string(),
  lastModified: z.date().optional()
})

// Import validation schemas
export const importDataSchema = z.object({
  version: z.string(),
  rules: z.array(
    z.object({
      id: z.string(),
      completed: z.boolean(),
      notes: z.string().optional()
    })
  ),
  preferences: userPreferencesSchema.optional()
})

// Form validation schemas
export const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required').max(200),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000)
})

export const feedbackFormSchema = z.object({
  rating: z.number().min(1).max(5),
  category: z.enum(['bug', 'feature', 'improvement', 'other']),
  message: z.string().min(10).max(1000),
  email: z.string().email().optional()
})

export const waitlistSchema = z.object({
  email: z.string().email('Please enter a valid email address')
})

// i18n schemas
export const translationSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  namespace: z.string().optional()
})

export const localeSchema = z.object({
  code: z.string().min(2).max(5),
  name: z.string(),
  direction: z.enum(['ltr', 'rtl']),
  translations: z.record(z.string(), translationSchema)
})

// SEO schemas
export const metaTagsSchema = z.object({
  title: z.string().max(60).optional(),
  description: z.string().max(160).optional(),
  keywords: z.array(z.string()).optional(),
  author: z.string().optional(),
  canonical: z.string().url().optional(),
  robots: z.string().optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImage: z.string().url().optional(),
  ogUrl: z.string().url().optional(),
  twitterCard: z.enum(['summary', 'summary_large_image', 'app', 'player']).optional(),
  twitterSite: z.string().optional(),
  twitterCreator: z.string().optional()
})

export const structuredDataSchema = z
  .object({
    '@context': z.string(),
    '@type': z.string()
  })
  .catchall(z.any())

const schemaValidators = {
  validateRule(data: unknown) {
    return ruleSchema.safeParse(data)
  },
  validateUserProgress(data: unknown) {
    return userProgressSchema.safeParse(data)
  },
  validateUserPreferences(data: unknown) {
    return userPreferencesSchema.safeParse(data)
  },
  validateExportData(data: unknown) {
    return exportDataSchema.safeParse(data)
  },
  validateImportData(data: unknown) {
    return importDataSchema.safeParse(data)
  },
  validateFilterOptions(data: unknown) {
    return filterOptionsSchema.safeParse(data)
  },
  validateAnalyticsEvent(data: unknown) {
    return analyticsEventSchema.safeParse(data)
  },
  validateFeatureFlag(data: unknown) {
    return featureFlagSchema.safeParse(data)
  }
}

export const validateRule = schemaValidators.validateRule
export const validateUserProgress = schemaValidators.validateUserProgress
export const validateUserPreferences = schemaValidators.validateUserPreferences
export const validateExportData = schemaValidators.validateExportData
export const validateImportData = schemaValidators.validateImportData
export const validateFilterOptions = schemaValidators.validateFilterOptions
export const validateAnalyticsEvent = schemaValidators.validateAnalyticsEvent
export const validateFeatureFlag = schemaValidators.validateFeatureFlag

// Type exports
export type RuleSchema = z.infer<typeof ruleSchema>
export type UserProgressSchema = z.infer<typeof userProgressSchema>
export type UserPreferencesSchema = z.infer<typeof userPreferencesSchema>
export type ExportDataSchema = z.infer<typeof exportDataSchema>
export type ImportDataSchema = z.infer<typeof importDataSchema>
export type FilterOptionsSchema = z.infer<typeof filterOptionsSchema>
export type AnalyticsEventSchema = z.infer<typeof analyticsEventSchema>
export type FeatureFlagSchema = z.infer<typeof featureFlagSchema>
export type MetaTagsSchema = z.infer<typeof metaTagsSchema>
export type WaitlistSchema = z.infer<typeof waitlistSchema>
