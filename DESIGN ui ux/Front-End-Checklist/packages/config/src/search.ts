export const PERFORMANCE = {
  FCP_THRESHOLD: 1800, // First Contentful Paint (ms)
  LCP_THRESHOLD: 2500, // Largest Contentful Paint (ms)
  FID_THRESHOLD: 100, // First Input Delay (ms)
  CLS_THRESHOLD: 0.1, // Cumulative Layout Shift
  TTI_THRESHOLD: 3800, // Time to Interactive (ms)
  TBT_THRESHOLD: 200 // Total Blocking Time (ms)
}

export const SEARCH = {
  MIN_QUERY_LENGTH: 2,
  MAX_RESULTS: 50,
  DEBOUNCE_MS: 300,
  FUZZY_THRESHOLD: 0.3,
  HIGHLIGHT_TAG: 'mark',
  INDEX_FIELDS: ['title', 'content', 'categories', 'priority']
}

export const EXPORT = {
  MAX_ITEMS: 1000,
  FORMATS: ['json', 'csv', 'pdf', 'markdown', 'html'] as const,
  PDF_OPTIONS: {
    format: 'A4',
    margin: { top: 20, right: 20, bottom: 20, left: 20 }
  }
}
