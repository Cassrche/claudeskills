import {
  analyticsEventSchema,
  categorySchema,
  checklistFrameworkSchema,
  exportDataSchema,
  exportFormatSchema,
  featureFlagSchema,
  filterOptionsSchema,
  importDataSchema,
  metaTagsSchema,
  rulePromptsSchema,
  ruleSchema,
  validateAnalyticsEvent,
  validateExportData,
  validateFeatureFlag,
  validateFilterOptions,
  validateImportData,
  validateRule,
  validateUserPreferences,
  validateUserProgress,
  waitlistSchema
} from '../index'

describe('@repo/schemas', () => {
  it('validates rules and prompts', () => {
    expect(
      validateRule({
        title: 'Rule',
        slug: 'rule',
        categories: ['html'],
        priority: 'high',
        sources: [
          {
            id: 'html-spec',
            title: 'WHATWG HTML',
            url: 'https://html.spec.whatwg.org/',
            type: 'spec',
            role: 'standard',
            authority: 'primary'
          },
          {
            id: 'mdn-html',
            title: 'MDN HTML',
            url: 'https://developer.mozilla.org/en-US/docs/Web/HTML',
            type: 'mdn',
            role: 'reference',
            authority: 'primary'
          }
        ],
        sourceSummary: {
          sourceCount: 2,
          primarySourceCount: 2,
          sourceRoleCount: 2
        },
        content: 'content',
        primaryCategory: 'html',
        url: '/rule',
        prompts: { check: 'c', fix: 'f', explain: 'e', codeReview: 'r' }
      }).success
    ).toBe(true)

    expect(rulePromptsSchema.safeParse({ check: '', fix: 'f', explain: 'e' }).success).toBe(false)
    expect(ruleSchema.safeParse({ slug: 'missing-title' }).success).toBe(false)
  })

  it('validates progress, preferences, filters, and analytics', () => {
    expect(validateUserProgress({ ruleId: 'rule', completed: true }).success).toBe(true)
    expect(
      validateUserPreferences({
        theme: 'dark',
        locale: 'en',
        selectedCategories: ['html'],
        selectedPriorities: ['high'],
        showCompleted: true,
        sortBy: 'priority',
        sortOrder: 'asc'
      }).success
    ).toBe(true)
    expect(validateFilterOptions({ categories: ['html'], query: 'seo' }).success).toBe(true)
    expect(validateAnalyticsEvent({ category: 'rule', action: 'open' }).success).toBe(true)
    expect(validateFeatureFlag({ key: 'feature', enabled: true }).success).toBe(true)
  })

  it('validates export and import schemas', () => {
    const exportData = {
      metadata: {
        exportedAt: new Date(),
        version: '1.0.0',
        totalRules: 1,
        completedRules: 1,
        progress: 100
      },
      rules: [
        {
          title: 'Rule',
          slug: 'rule',
          categories: ['html'],
          priority: 'high',
          sources: [
            {
              id: 'html-spec',
              title: 'WHATWG HTML',
              url: 'https://html.spec.whatwg.org/',
              type: 'spec',
              role: 'standard',
              authority: 'primary'
            },
            {
              id: 'mdn-html',
              title: 'MDN HTML',
              url: 'https://developer.mozilla.org/en-US/docs/Web/HTML',
              type: 'mdn',
              role: 'reference',
              authority: 'primary'
            }
          ],
          sourceSummary: {
            sourceCount: 2,
            primarySourceCount: 2,
            sourceRoleCount: 2
          },
          content: 'content',
          primaryCategory: 'html',
          url: '/rule'
        }
      ],
      progress: [{ ruleId: 'rule', completed: true }]
    }

    expect(validateExportData(exportData).success).toBe(true)
    expect(
      validateImportData({
        version: '1.0.0',
        rules: [{ id: 'rule', completed: false }]
      }).success
    ).toBe(true)
    expect(exportDataSchema.safeParse(exportData).success).toBe(true)
    expect(importDataSchema.safeParse({ version: '1.0.0', rules: [] }).success).toBe(true)
  })

  it('covers remaining schema helpers and enums', () => {
    expect(exportFormatSchema.options).toContain('json')
    expect(categorySchema.options).toContain('html')
    expect(checklistFrameworkSchema.options).toContain('vite')
    expect(checklistFrameworkSchema.options).toContain('astro')
    expect(checklistFrameworkSchema.options).toContain('sveltekit')
    expect(waitlistSchema.safeParse({ email: 'test@example.com' }).success).toBe(true)
    expect(metaTagsSchema.safeParse({ title: 'Title', twitterCard: 'summary' }).success).toBe(true)
    expect(analyticsEventSchema.safeParse({ category: 'c', action: 'a', value: 1 }).success).toBe(
      true
    )
    expect(
      featureFlagSchema.safeParse({ key: 'flag', enabled: false, metadata: { ok: 'yes' } }).success
    ).toBe(true)
    expect(
      filterOptionsSchema.safeParse({ priorities: ['critical'], completed: false }).success
    ).toBe(true)
  })
})
