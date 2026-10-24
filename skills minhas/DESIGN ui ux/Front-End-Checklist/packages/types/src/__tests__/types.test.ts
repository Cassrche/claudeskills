import type {
  AnalyticsEvent,
  Category,
  ExportData,
  ExportFormat,
  ExportOptions,
  FeatureFlag,
  FilterOptions,
  MetaTags,
  Priority,
  Rule,
  RuleCredibilityDecision,
  RuleFeedbackResponse,
  RuleFeedbackSummary,
  RuleFeedbackValue,
  SearchResult,
  SortOptions,
  UserPreferences,
  UserProgress,
  VirtualItem
} from '../index.js'

describe('@repo/types', () => {
  describe('Type definitions', () => {
    it('should allow valid Priority values', () => {
      const validPriorities: Priority[] = ['critical', 'high', 'medium', 'low']
      expect(validPriorities).toHaveLength(4)
    })

    it('should allow valid Category values', () => {
      const validCategories: Category[] = [
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
      ]
      expect(validCategories).toHaveLength(12)
    })

    it('should allow valid checklist framework values', () => {
      const validFrameworks = ['vite', 'nextjs', 'astro', 'sveltekit', 'react'] as const
      expect(validFrameworks).toHaveLength(5)
    })

    it('should create valid Rule object', () => {
      const rule: Rule = {
        title: 'Test Rule',
        slug: 'test-rule',
        categories: ['html', 'css'],
        priority: 'high',
        content: 'Test content',
        primaryCategory: 'html',
        url: '/rules/test-rule',
        prompts: {
          check: 'Check this',
          fix: 'Fix this',
          explain: 'Explain this'
        }
      }

      expect(rule.title).toBe('Test Rule')
      expect(rule.categories).toContain('html')
      expect(rule.priority).toBe('high')
    })

    it('should create valid UserProgress object', () => {
      const progress: UserProgress = {
        ruleId: 'test-rule',
        completed: true,
        completedAt: new Date(),
        notes: 'Test notes'
      }

      expect(progress.ruleId).toBe('test-rule')
      expect(progress.completed).toBe(true)
      expect(progress.completedAt).toBeInstanceOf(Date)
    })

    it('should create valid UserPreferences object', () => {
      const preferences: UserPreferences = {
        theme: 'dark',
        locale: 'en',
        selectedCategories: ['html', 'css'],
        selectedPriorities: ['high', 'critical'],
        showCompleted: true,
        sortBy: 'priority',
        sortOrder: 'asc'
      }

      expect(preferences.theme).toBe('dark')
      expect(preferences.selectedCategories).toContain('html')
      expect(preferences.sortBy).toBe('priority')
    })

    it('should allow valid ExportFormat values', () => {
      const formats: ExportFormat[] = ['json', 'csv', 'pdf', 'markdown', 'html']
      expect(formats).toHaveLength(5)
    })

    it('should create valid ExportOptions object', () => {
      const options: ExportOptions = {
        format: 'json',
        includeCompleted: true,
        includeNotes: false,
        categories: ['html'],
        priorities: ['high']
      }

      expect(options.format).toBe('json')
      expect(options.includeCompleted).toBe(true)
    })

    it('should create valid ExportData object', () => {
      const exportData: ExportData = {
        metadata: {
          exportedAt: new Date(),
          version: '2.0.0',
          totalRules: 100,
          completedRules: 50,
          progress: 50
        },
        rules: [],
        progress: [],
        preferences: undefined
      }

      expect(exportData.metadata.version).toBe('2.0.0')
      expect(exportData.metadata.progress).toBe(50)
    })

    it('should create valid SearchResult object', () => {
      const mockRule: Rule = {
        title: 'Test',
        slug: 'test',
        categories: ['html'],
        priority: 'high',
        content: 'Test',
        primaryCategory: 'html',
        url: '/test'
      }

      const result: SearchResult = {
        rule: mockRule,
        score: 10,
        matches: [{ field: 'title', indices: [[0, 4]] }]
      }

      expect(result.score).toBe(10)
      expect(result.matches[0].field).toBe('title')
    })

    it('should allow valid RuleFeedbackValue values', () => {
      const values: RuleFeedbackValue[] = ['helpful', 'not_helpful']
      expect(values).toHaveLength(2)
    })

    it('should create valid RuleFeedbackSummary and decision objects', () => {
      const summary: RuleFeedbackSummary = {
        totalResponses: 10,
        helpfulCount: 8,
        notHelpfulCount: 2,
        helpfulRatio: 0.8
      }
      const decision: RuleCredibilityDecision = {
        publicEligible: false,
        reason: 'insufficient_volume'
      }

      expect(summary.helpfulRatio).toBe(0.8)
      expect(decision.reason).toBe('insufficient_volume')
    })

    it('should create valid RuleFeedbackResponse object', () => {
      const response: RuleFeedbackResponse = {
        currentUserFeedback: 'helpful',
        summary: {
          totalResponses: 2,
          helpfulCount: 1,
          notHelpfulCount: 1,
          helpfulRatio: 0.5
        },
        credibility: {
          publicEligible: false,
          reason: 'insufficient_volume'
        }
      }

      expect(response.currentUserFeedback).toBe('helpful')
      expect(response.summary.totalResponses).toBe(2)
    })

    it('should create valid FilterOptions object', () => {
      const filters: FilterOptions = {
        categories: ['html', 'css'],
        priorities: ['high'],
        completed: false,
        query: 'test'
      }

      expect(filters.categories).toContain('html')
      expect(filters.completed).toBe(false)
    })

    it('should create valid SortOptions object', () => {
      const sort: SortOptions = {
        field: 'priority',
        order: 'desc'
      }

      expect(sort.field).toBe('priority')
      expect(sort.order).toBe('desc')
    })

    it('should create valid AnalyticsEvent object', () => {
      const event: AnalyticsEvent = {
        category: 'rule',
        action: 'complete',
        label: 'html5-doctype',
        value: 1
      }

      expect(event.category).toBe('rule')
      expect(event.action).toBe('complete')
    })

    it('should create valid FeatureFlag object', () => {
      const flag: FeatureFlag = {
        key: 'new-feature',
        enabled: true,
        variant: 'A',
        metadata: { test: true }
      }

      expect(flag.key).toBe('new-feature')
      expect(flag.enabled).toBe(true)
    })

    it('should create valid MetaTags object', () => {
      const meta: MetaTags = {
        title: 'Test Page',
        description: 'Test description',
        keywords: ['test', 'page'],
        ogTitle: 'Test OG Title',
        twitterCard: 'summary'
      }

      expect(meta.title).toBe('Test Page')
      expect(meta.keywords).toContain('test')
      expect(meta.twitterCard).toBe('summary')
    })

    it('should create valid VirtualItem object', () => {
      const item: VirtualItem = {
        index: 0,
        start: 0,
        end: 100,
        size: 100,
        key: 'item-0'
      }

      expect(item.index).toBe(0)
      expect(item.size).toBe(100)
    })
  })

  describe('Type exports', () => {
    it('should export type aliases', () => {
      // This test just ensures the imports compile
      const typeSmoke: {
        rule: import('../index.js').ChecklistRule
        progress: import('../index.js').Progress
        preferences: import('../index.js').Preferences
      } = {
        rule: {} as import('../index.js').ChecklistRule,
        progress: {} as import('../index.js').Progress,
        preferences: {} as import('../index.js').Preferences
      }

      expect(typeSmoke).toBeDefined()
    })
  })
})
