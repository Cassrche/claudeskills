import { DEFAULT_LOCALE, FEATURES, STORAGE_KEYS } from '@repo/config'
import { storage } from '@repo/storage'
import type { Category, FilterOptions, Priority, SortOptions, UserPreferences } from '@repo/types'
import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { useShallow } from 'zustand/react/shallow'

// App state interface
interface AppState {
  // UI State
  sidebarOpen: boolean
  searchQuery: string
  activeView: 'grid' | 'list' | 'compact'
  showFilters: boolean
  showProgress: boolean
  useWithAiOpen: boolean

  // Filter State
  filters: FilterOptions
  sort: SortOptions

  // User Preferences
  preferences: UserPreferences

  // Feature Flags
  features: Record<string, boolean>

  // Actions
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setSearchQuery: (query: string) => void
  setActiveView: (view: 'grid' | 'list' | 'compact') => void
  setShowFilters: (show: boolean) => void
  setShowProgress: (show: boolean) => void
  setUseWithAiOpen: (open: boolean) => void

  // Filter Actions
  setFilters: (filters: Partial<FilterOptions>) => void
  clearFilters: () => void
  toggleCategory: (category: Category) => void
  togglePriority: (priority: Priority) => void
  setCompletedFilter: (completed: boolean | undefined) => void

  // Sort Actions
  setSort: (sort: SortOptions) => void

  // Preference Actions
  setPreferences: (preferences: Partial<UserPreferences>) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setLocale: (locale: string) => void

  // Feature Flag Actions
  setFeatures: (features: Record<string, boolean>) => void
  toggleFeature: (key: string) => void

  // Reset Actions
  resetUIState: () => void
  resetAll: () => void
}

// Initial state
const initialState = {
  sidebarOpen: true,
  searchQuery: '',
  activeView: 'grid' as const,
  showFilters: true,
  showProgress: true,
  useWithAiOpen: false,
  filters: {
    categories: undefined,
    priorities: undefined,
    completed: undefined,
    query: undefined
  },
  sort: {
    field: 'priority' as const,
    order: 'asc' as const
  },
  preferences: {
    theme: 'system' as const,
    locale: DEFAULT_LOCALE,
    selectedCategories: [],
    selectedPriorities: [],
    showCompleted: true,
    sortBy: 'priority' as const,
    sortOrder: 'asc' as const
  },
  features: FEATURES
}

// Create the store
export const useAppStore = create<AppState>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer(set => ({
          ...initialState,

          // UI Actions
          setSidebarOpen: open =>
            set(state => {
              state.sidebarOpen = open
            }),

          toggleSidebar: () =>
            set(state => {
              state.sidebarOpen = !state.sidebarOpen
            }),

          setSearchQuery: query =>
            set(state => {
              state.searchQuery = query
            }),

          setActiveView: view =>
            set(state => {
              state.activeView = view
            }),

          setShowFilters: show =>
            set(state => {
              state.showFilters = show
            }),

          setShowProgress: show =>
            set(state => {
              state.showProgress = show
            }),

          setUseWithAiOpen: open =>
            set(state => {
              state.useWithAiOpen = open
            }),

          // Filter Actions
          setFilters: filters =>
            set(state => {
              state.filters = { ...state.filters, ...filters }
            }),

          clearFilters: () =>
            set(state => {
              state.filters = {
                categories: undefined,
                priorities: undefined,
                completed: undefined,
                query: undefined
              }
            }),

          toggleCategory: category =>
            set(state => {
              const current = state.filters.categories || []
              const index = current.indexOf(category)

              if (index >= 0) {
                state.filters.categories = current.filter((c: string) => c !== category)
              } else {
                state.filters.categories = [...current, category]
              }

              if (state.filters.categories?.length === 0) {
                state.filters.categories = undefined
              }
            }),

          togglePriority: priority =>
            set(state => {
              const current = state.filters.priorities || []
              const index = current.indexOf(priority)

              if (index >= 0) {
                state.filters.priorities = current.filter((p: string) => p !== priority)
              } else {
                state.filters.priorities = [...current, priority]
              }

              if (state.filters.priorities?.length === 0) {
                state.filters.priorities = undefined
              }
            }),

          setCompletedFilter: completed =>
            set(state => {
              state.filters.completed = completed
            }),

          // Sort Actions
          setSort: sort =>
            set(state => {
              state.sort = sort
            }),

          // Preference Actions
          setPreferences: preferences =>
            set(state => {
              state.preferences = { ...state.preferences, ...preferences }
            }),

          setTheme: theme =>
            set(state => {
              state.preferences.theme = theme
            }),

          setLocale: locale =>
            set(state => {
              state.preferences.locale = locale
            }),

          // Feature Flag Actions
          setFeatures: features =>
            set(state => {
              state.features = features
            }),

          toggleFeature: key =>
            set(state => {
              state.features[key] = !state.features[key]
            }),

          // Reset Actions
          resetUIState: () =>
            set(state => {
              state.sidebarOpen = initialState.sidebarOpen
              state.searchQuery = initialState.searchQuery
              state.activeView = initialState.activeView
              state.showFilters = initialState.showFilters
              state.showProgress = initialState.showProgress
              state.useWithAiOpen = initialState.useWithAiOpen
            }),

          resetAll: () => set(() => initialState)
        }))
      ),
      {
        name: STORAGE_KEYS.USER_PREFERENCES,
        partialize: state => ({
          activeView: state.activeView,
          showFilters: state.showFilters,
          showProgress: state.showProgress,
          useWithAiOpen: state.useWithAiOpen,
          preferences: state.preferences,
          sort: state.sort
        })
      }
    ),
    {
      name: 'app-store'
    }
  )
)

// Selectors
export const useUIState = () =>
  useAppStore(
    useShallow(state => ({
      sidebarOpen: state.sidebarOpen,
      searchQuery: state.searchQuery,
      activeView: state.activeView,
      showFilters: state.showFilters,
      showProgress: state.showProgress,
      useWithAiOpen: state.useWithAiOpen
    }))
  )

export const useFilterState = () =>
  useAppStore(
    useShallow(state => ({
      filters: state.filters,
      sort: state.sort
    }))
  )

export const usePreferences = () => useAppStore(state => state.preferences)
export const useFeatures = () => useAppStore(state => state.features)

// Individual selectors
export const useSidebarOpen = () => useAppStore(state => state.sidebarOpen)
export const useSearchQuery = () => useAppStore(state => state.searchQuery)
export const useActiveView = () => useAppStore(state => state.activeView)
export const useUseWithAiOpen = () => useAppStore(state => state.useWithAiOpen)
export const useTheme = () => useAppStore(state => state.preferences.theme)
export const useLocale = () => useAppStore(state => state.preferences.locale)

// Actions only
export const useAppActions = () =>
  useAppStore(
    useShallow(state => ({
      setSidebarOpen: state.setSidebarOpen,
      toggleSidebar: state.toggleSidebar,
      setSearchQuery: state.setSearchQuery,
      setActiveView: state.setActiveView,
      setShowFilters: state.setShowFilters,
      setShowProgress: state.setShowProgress,
      setUseWithAiOpen: state.setUseWithAiOpen,
      setFilters: state.setFilters,
      clearFilters: state.clearFilters,
      toggleCategory: state.toggleCategory,
      togglePriority: state.togglePriority,
      setCompletedFilter: state.setCompletedFilter,
      setSort: state.setSort,
      setPreferences: state.setPreferences,
      setTheme: state.setTheme,
      setLocale: state.setLocale,
      setFeatures: state.setFeatures,
      toggleFeature: state.toggleFeature,
      resetUIState: state.resetUIState,
      resetAll: state.resetAll
    }))
  )

// Subscription helpers
export function subscribeToTheme(callback: (theme: 'light' | 'dark' | 'system') => void) {
  return useAppStore.subscribe(state => state.preferences.theme, callback)
}

export function subscribeToLocale(callback: (locale: string) => void) {
  return useAppStore.subscribe(state => state.preferences.locale, callback)
}

// Persist preferences to storage
useAppStore.subscribe(
  state => state.preferences,
  async preferences => {
    await storage.savePreferences(preferences)
  }
)
