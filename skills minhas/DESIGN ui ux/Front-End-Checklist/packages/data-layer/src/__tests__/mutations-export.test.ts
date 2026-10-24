import { storage } from '@repo/storage'
import type { ExportOptions, Rule, UserPreferences, UserProgress } from '@repo/types'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import React from 'react'
import { buildExportData, useExportData } from '../mutations'

const preferences: UserPreferences = {
  theme: 'system',
  locale: 'en',
  selectedCategories: [],
  selectedPriorities: [],
  showCompleted: true,
  sortBy: 'priority',
  sortOrder: 'asc'
}

function createRule(overrides: Partial<Rule> = {}): Rule {
  return {
    title: 'Sample Rule',
    slug: 'sample-rule',
    categories: ['html'],
    priority: 'medium',
    content: 'content',
    primaryCategory: 'html',
    url: '/en/rules/html/sample-rule',
    ...overrides
  }
}

function createExportOptions(overrides: Partial<ExportOptions> = {}): ExportOptions {
  return {
    format: 'json',
    includeCompleted: true,
    includeNotes: true,
    ...overrides
  }
}

describe('buildExportData', () => {
  it('excludes completed rules with id-based progress keys and computes metadata accurately', () => {
    const rules = [
      { ...createRule({ slug: 'legacy-slug' }), id: 'rule-1' } as Rule,
      { ...createRule({ slug: 'still-open', title: 'Still Open' }), id: 'rule-2' } as Rule
    ]

    const progress: UserProgress[] = [
      { ruleId: 'rule-1', completed: true, notes: 'done' },
      { ruleId: 'rule-2', completed: false, notes: 'todo' }
    ]

    const result = buildExportData({
      exportOptions: createExportOptions({ includeCompleted: false, includeNotes: false }),
      progress,
      preferences,
      rules
    })

    expect(result.rules).toHaveLength(1)
    expect(result.rules[0].slug).toBe('still-open')
    expect(result.metadata.totalRules).toBe(1)
    expect(result.metadata.completedRules).toBe(0)
    expect(result.metadata.progress).toBe(0)
    expect(result.progress).toEqual([{ ruleId: 'rule-2', completed: false, notes: undefined }])
  })

  it('supports slug-based progress keys for legacy data', () => {
    const rules = [createRule({ slug: 'legacy-slug' })]
    const progress: UserProgress[] = [{ ruleId: 'legacy-slug', completed: true }]

    const result = buildExportData({
      exportOptions: createExportOptions(),
      progress,
      preferences,
      rules
    })

    expect(result.metadata.totalRules).toBe(1)
    expect(result.metadata.completedRules).toBe(1)
    expect(result.metadata.progress).toBe(100)
  })

  it('filters by category and priority and omits preferences when unavailable', () => {
    const rules = [
      createRule({ slug: 'html-rule', categories: ['html'], priority: 'high' }),
      createRule({ slug: 'css-rule', categories: ['css'], priority: 'low', primaryCategory: 'css' })
    ]

    const result = buildExportData({
      exportOptions: createExportOptions({
        categories: ['html'],
        priorities: ['high'],
        includeCompleted: true
      }),
      progress: [],
      preferences: null,
      rules
    })

    expect(result.rules).toHaveLength(1)
    expect(result.rules[0].slug).toBe('html-rule')
    expect(result.preferences).toBeUndefined()
  })

  it('retains notes when includeNotes is enabled', () => {
    const rules = [createRule({ slug: 'legacy-slug' })]
    const progress: UserProgress[] = [{ ruleId: 'legacy-slug', completed: true, notes: 'keep me' }]

    const result = buildExportData({
      exportOptions: createExportOptions({ includeNotes: true }),
      progress,
      preferences,
      rules
    })

    expect(result.progress[0].notes).toBe('keep me')
  })

  it('returns zero progress metadata when no rules remain after filtering', () => {
    const result = buildExportData({
      exportOptions: createExportOptions({ categories: ['css'] }),
      progress: [],
      preferences,
      rules: [createRule({ categories: ['html'] })]
    })

    expect(result.rules).toHaveLength(0)
    expect(result.metadata.totalRules).toBe(0)
    expect(result.metadata.progress).toBe(0)
  })
})

describe('useExportData', () => {
  it('builds export data from query cache and storage', async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['rules'], [createRule({ slug: 'cached-rule', id: 'rule-1' })])

    jest.spyOn(storage, 'loadProgress').mockResolvedValue([{ ruleId: 'rule-1', completed: true }])
    jest.spyOn(storage, 'loadPreferences').mockResolvedValue(preferences)

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children)

    const { result } = renderHook(() => useExportData(), { wrapper })

    const data = await result.current.mutateAsync(createExportOptions())

    expect(data.rules).toHaveLength(1)
    expect(data.metadata.completedRules).toBe(1)
    expect(storage.loadProgress).toHaveBeenCalled()
    expect(storage.loadPreferences).toHaveBeenCalled()
  })
})
