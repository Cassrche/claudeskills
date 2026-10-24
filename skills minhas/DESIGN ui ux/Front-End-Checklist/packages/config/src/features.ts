export const FEATURES = {
  ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  EXPORT_PDF: process.env.NEXT_PUBLIC_ENABLE_PDF_EXPORT === 'true',
  OFFLINE_MODE: process.env.NEXT_PUBLIC_ENABLE_OFFLINE === 'true',
  USER_ACCOUNTS: process.env.NEXT_PUBLIC_ENABLE_ACCOUNTS === 'true',
  DARK_MODE: process.env.NEXT_PUBLIC_ENABLE_DARK_MODE !== 'false', // Enabled by default
  SEARCH: process.env.NEXT_PUBLIC_ENABLE_SEARCH !== 'false', // Enabled by default
  FILTERS: process.env.NEXT_PUBLIC_ENABLE_FILTERS !== 'false', // Enabled by default
  PROGRESS_TRACKING: process.env.NEXT_PUBLIC_ENABLE_PROGRESS !== 'false', // Enabled by default
  KEYBOARD_SHORTCUTS: process.env.NEXT_PUBLIC_ENABLE_SHORTCUTS === 'true',
  AI_SUGGESTIONS: process.env.NEXT_PUBLIC_ENABLE_AI === 'true',
  SOCIAL_SHARING: process.env.NEXT_PUBLIC_ENABLE_SHARING === 'true',
  COMMENTS: process.env.NEXT_PUBLIC_ENABLE_COMMENTS === 'true'
}
