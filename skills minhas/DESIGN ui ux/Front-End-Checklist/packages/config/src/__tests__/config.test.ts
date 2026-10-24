import {
  CACHE,
  CATEGORIES,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  DEFAULT_CONFIG,
  DEFAULT_LOCALE,
  EXPORT,
  FEATURES,
  getConfig,
  isValidCategory,
  isValidLocale,
  isValidPriority,
  PERFORMANCE,
  PRIORITIES,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  SEARCH,
  STORAGE_KEYS,
  SUPPORTED_LOCALES
} from '../index'

describe('@repo/config', () => {
  describe('Categories configuration', () => {
    it('should have all categories defined', () => {
      expect(CATEGORIES).toHaveLength(12)
      expect(CATEGORIES).toContain('html')
      expect(CATEGORIES).toContain('css')
      expect(CATEGORIES).toContain('javascript')
    })

    it('should have labels for all categories', () => {
      CATEGORIES.forEach((category: (typeof CATEGORIES)[number]) => {
        expect(CATEGORY_LABELS[category]).toBeDefined()
        expect(typeof CATEGORY_LABELS[category]).toBe('string')
      })
    })

    it('should have colors for all categories', () => {
      CATEGORIES.forEach((category: (typeof CATEGORIES)[number]) => {
        expect(CATEGORY_COLORS[category]).toBeDefined()
        expect(CATEGORY_COLORS[category]).toMatch(/^#[0-9a-f]{6}$/i)
      })
    })
  })

  describe('Priorities configuration', () => {
    it('should have all priorities defined', () => {
      expect(PRIORITIES).toHaveLength(4)
      expect(PRIORITIES).toEqual(['critical', 'high', 'medium', 'low'])
    })

    it('should have labels for all priorities', () => {
      PRIORITIES.forEach((priority: (typeof PRIORITIES)[number]) => {
        expect(PRIORITY_LABELS[priority]).toBeDefined()
        expect(typeof PRIORITY_LABELS[priority]).toBe('string')
      })
    })

    it('should have colors for all priorities', () => {
      PRIORITIES.forEach((priority: (typeof PRIORITIES)[number]) => {
        expect(PRIORITY_COLORS[priority]).toBeDefined()
        expect(PRIORITY_COLORS[priority]).toMatch(/^#[0-9a-f]{6}$/i)
      })
    })
  })

  describe('Localization configuration', () => {
    it('should have default locale', () => {
      expect(DEFAULT_LOCALE).toBe('en')
    })

    it('should have supported locales', () => {
      expect(SUPPORTED_LOCALES).toEqual(['en'])
    })
  })

  describe('Feature flags', () => {
    it('should have feature flags defined', () => {
      expect(FEATURES).toBeDefined()
      expect(typeof FEATURES.DARK_MODE).toBe('boolean')
      expect(typeof FEATURES.SEARCH).toBe('boolean')
      expect(typeof FEATURES.FILTERS).toBe('boolean')
    })
  })

  describe('Storage keys', () => {
    it('should have all storage keys defined', () => {
      expect(STORAGE_KEYS.USER_PREFERENCES).toBe('fec_preferences')
      expect(STORAGE_KEYS.USER_PROGRESS).toBe('fec_progress')
      expect(STORAGE_KEYS.SEARCH_HISTORY).toBe('fec_search_history')
      expect(STORAGE_KEYS.THEME).toBe('fec_theme')
    })
  })

  describe('Cache configuration', () => {
    it('should have cache version', () => {
      expect(CACHE.VERSION).toBeDefined()
      expect(typeof CACHE.VERSION).toBe('string')
    })

    it('should have TTL values', () => {
      expect(CACHE.TTL.DEFAULT).toBe(1000 * 60 * 60) // 1 hour
      expect(CACHE.TTL.RULES).toBe(1000 * 60 * 60 * 24) // 24 hours
      expect(CACHE.TTL.USER_DATA).toBe(1000 * 60 * 5) // 5 minutes
    })

    it('should have max size limits', () => {
      expect(CACHE.MAX_SIZE.STORAGE).toBe(5 * 1024 * 1024) // 5MB
      expect(CACHE.MAX_SIZE.MEMORY).toBe(10 * 1024 * 1024) // 10MB
    })
  })

  describe('Performance thresholds', () => {
    it('should have Core Web Vitals thresholds', () => {
      expect(PERFORMANCE.FCP_THRESHOLD).toBe(1800)
      expect(PERFORMANCE.LCP_THRESHOLD).toBe(2500)
      expect(PERFORMANCE.FID_THRESHOLD).toBe(100)
      expect(PERFORMANCE.CLS_THRESHOLD).toBe(0.1)
    })
  })

  describe('Search configuration', () => {
    it('should have search parameters', () => {
      expect(SEARCH.MIN_QUERY_LENGTH).toBe(2)
      expect(SEARCH.MAX_RESULTS).toBe(50)
      expect(SEARCH.DEBOUNCE_MS).toBe(300)
      expect(SEARCH.FUZZY_THRESHOLD).toBe(0.3)
      expect(SEARCH.HIGHLIGHT_TAG).toBe('mark')
    })

    it('should have index fields', () => {
      expect(SEARCH.INDEX_FIELDS).toContain('title')
      expect(SEARCH.INDEX_FIELDS).toContain('content')
      expect(SEARCH.INDEX_FIELDS).toContain('categories')
    })
  })

  describe('Export configuration', () => {
    it('should have export limits', () => {
      expect(EXPORT.MAX_ITEMS).toBe(1000)
    })

    it('should have export formats', () => {
      expect(EXPORT.FORMATS).toContain('json')
      expect(EXPORT.FORMATS).toContain('csv')
      expect(EXPORT.FORMATS).toContain('pdf')
    })

    it('should have PDF options', () => {
      expect(EXPORT.PDF_OPTIONS.format).toBe('A4')
      expect(EXPORT.PDF_OPTIONS.margin).toBeDefined()
    })
  })

  describe('Default configuration', () => {
    it('should have default config object', () => {
      expect(DEFAULT_CONFIG).toBeDefined()
      expect(DEFAULT_CONFIG.features).toBeDefined()
      expect(DEFAULT_CONFIG.defaultLocale).toBe('en')
      expect(DEFAULT_CONFIG.supportedLocales).toEqual(SUPPORTED_LOCALES)
    })
  })

  describe('Configuration getter', () => {
    it('should get config value', () => {
      const locale = getConfig('defaultLocale')
      expect(locale).toBe('en')
    })

    it('should get features object', () => {
      const features = getConfig('features')
      expect(features).toBeDefined()
      expect(typeof features).toBe('object')
    })
  })

  describe('Validation helpers', () => {
    describe('isValidCategory', () => {
      it('should validate correct categories', () => {
        expect(isValidCategory('html')).toBe(true)
        expect(isValidCategory('css')).toBe(true)
        expect(isValidCategory('javascript')).toBe(true)
      })

      it('should reject invalid categories', () => {
        expect(isValidCategory('invalid')).toBe(false)
        expect(isValidCategory('HTML')).toBe(false)
        expect(isValidCategory('')).toBe(false)
      })
    })

    describe('isValidPriority', () => {
      it('should validate correct priorities', () => {
        expect(isValidPriority('critical')).toBe(true)
        expect(isValidPriority('high')).toBe(true)
        expect(isValidPriority('medium')).toBe(true)
        expect(isValidPriority('low')).toBe(true)
      })

      it('should reject invalid priorities', () => {
        expect(isValidPriority('urgent')).toBe(false)
        expect(isValidPriority('HIGH')).toBe(false)
        expect(isValidPriority('')).toBe(false)
      })
    })

    describe('isValidLocale', () => {
      it('should validate correct locales', () => {
        expect(isValidLocale('en')).toBe(true)
      })

      it('should reject invalid locales', () => {
        expect(isValidLocale('fr')).toBe(false)
        expect(isValidLocale('es')).toBe(false)
        expect(isValidLocale('xx')).toBe(false)
        expect(isValidLocale('english')).toBe(false)
        expect(isValidLocale('')).toBe(false)
      })
    })
  })
})
