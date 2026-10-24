export const STORAGE_KEYS = {
  USER_PREFERENCES: 'fec_preferences',
  USER_PROGRESS: 'fec_progress',
  SEARCH_HISTORY: 'fec_search_history',
  EXPORT_HISTORY: 'fec_export_history',
  THEME: 'fec_theme',
  LOCALE: 'fec_locale',
  FEATURE_FLAGS: 'fec_features',
  RULES_COLLAPSED: 'fec_rules_collapsed',
  RULES_EXPANDED: 'fec_rules_expanded',
  CACHE_VERSION: 'fec_cache_version'
}

export const CACHE = {
  VERSION: '1.0.0',
  TTL: {
    DEFAULT: 1000 * 60 * 60, // 1 hour
    RULES: 1000 * 60 * 60 * 24, // 24 hours
    USER_DATA: 1000 * 60 * 5, // 5 minutes
    SEARCH_RESULTS: 1000 * 60 * 10 // 10 minutes
  },
  MAX_SIZE: {
    STORAGE: 5 * 1024 * 1024, // 5MB
    MEMORY: 10 * 1024 * 1024 // 10MB
  }
}
