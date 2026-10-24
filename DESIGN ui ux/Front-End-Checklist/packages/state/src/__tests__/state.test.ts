jest.mock('@repo/storage', () => ({
  storage: {
    savePreferences: jest.fn().mockResolvedValue(undefined)
  }
}))

import { storage } from '@repo/storage'
import { renderHook } from '@testing-library/react'
import {
  subscribeToLocale,
  subscribeToTheme,
  useActiveView,
  useAppActions,
  useAppStore,
  useFeatures,
  useFilterState,
  useLocale,
  usePreferences,
  useSearchQuery,
  useSidebarOpen,
  useTheme,
  useUIState,
  useUseWithAiOpen
} from '../index'

describe('@repo/state', () => {
  beforeEach(() => {
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn()
      },
      configurable: true
    })
    useAppStore.getState().resetAll()
    jest.clearAllMocks()
  })

  it('exposes selectors for current state', () => {
    expect(renderHook(() => useSidebarOpen()).result.current).toBe(true)
    expect(renderHook(() => useSearchQuery()).result.current).toBe('')
    expect(renderHook(() => useActiveView()).result.current).toBe('grid')
    expect(renderHook(() => useUseWithAiOpen()).result.current).toBe(false)
    expect(renderHook(() => useTheme()).result.current).toBe('system')
    expect(renderHook(() => useLocale()).result.current).toBe('en')
    expect(renderHook(() => usePreferences()).result.current.sortBy).toBe('priority')
    expect(renderHook(() => useFeatures()).result.current).toBeDefined()
    expect(renderHook(() => useUIState()).result.current.sidebarOpen).toBe(true)
    expect(renderHook(() => useUIState()).result.current.useWithAiOpen).toBe(false)
    expect(renderHook(() => useFilterState()).result.current.sort.field).toBe('priority')
  })

  it('updates UI state through actions', () => {
    const actions = renderHook(() => useAppActions()).result.current
    actions.setSidebarOpen(false)
    actions.setSearchQuery('html')
    actions.setActiveView('compact')
    actions.setShowFilters(false)
    actions.setShowProgress(false)
    actions.setUseWithAiOpen(true)

    expect(useAppStore.getState().sidebarOpen).toBe(false)
    expect(useAppStore.getState().searchQuery).toBe('html')
    expect(useAppStore.getState().activeView).toBe('compact')
    expect(useAppStore.getState().showFilters).toBe(false)
    expect(useAppStore.getState().showProgress).toBe(false)
    expect(useAppStore.getState().useWithAiOpen).toBe(true)
  })

  it('updates filters, sort options, preferences, and feature flags', () => {
    const actions = renderHook(() => useAppActions()).result.current
    actions.toggleCategory('html')
    actions.toggleCategory('html')
    actions.togglePriority('high')
    actions.togglePriority('high')
    actions.setCompletedFilter(true)
    actions.setFilters({ query: 'search' })
    actions.clearFilters()
    actions.setSort({ field: 'title', order: 'desc' })
    actions.setPreferences({ showCompleted: false })
    actions.setTheme('dark')
    actions.setLocale('fr')
    actions.setFeatures({ featureA: true })
    actions.toggleFeature('featureA')

    expect(useAppStore.getState().filters.completed).toBeUndefined()
    expect(useAppStore.getState().sort.field).toBe('title')
    expect(useAppStore.getState().preferences.theme).toBe('dark')
    expect(useAppStore.getState().preferences.locale).toBe('fr')
    expect(useAppStore.getState().features.featureA).toBe(false)
  })

  it('resets UI state and all state', () => {
    const actions = renderHook(() => useAppActions()).result.current
    actions.setSidebarOpen(false)
    actions.setSearchQuery('query')
    actions.setActiveView('list')
    actions.setUseWithAiOpen(true)
    actions.resetUIState()

    expect(useAppStore.getState().sidebarOpen).toBe(true)
    expect(useAppStore.getState().searchQuery).toBe('')
    expect(useAppStore.getState().activeView).toBe('grid')
    expect(useAppStore.getState().useWithAiOpen).toBe(false)

    actions.setTheme('dark')
    actions.resetAll()
    expect(useAppStore.getState().preferences.theme).toBe('system')
  })

  it('supports subscriptions and persists preferences', async () => {
    const themeCallback = jest.fn()
    const localeCallback = jest.fn()
    const unsubscribeTheme = subscribeToTheme(themeCallback)
    const unsubscribeLocale = subscribeToLocale(localeCallback)

    const actions = renderHook(() => useAppActions()).result.current
    actions.setTheme('dark')
    actions.setLocale('fr')

    expect(themeCallback).toHaveBeenCalledWith('dark', 'system')
    expect(localeCallback).toHaveBeenCalledWith('fr', 'en')

    await Promise.resolve()
    expect(storage.savePreferences).toHaveBeenCalled()

    unsubscribeTheme()
    unsubscribeLocale()
  })
})
