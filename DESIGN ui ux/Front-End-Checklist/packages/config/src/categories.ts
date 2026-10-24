import type { Category } from '@repo/types'

export const CATEGORIES: Category[] = [
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

export const CATEGORY_LABELS: Record<Category, string> = {
  html: 'HTML',
  css: 'CSS',
  javascript: 'JavaScript',
  performance: 'Performance',
  accessibility: 'Accessibility',
  seo: 'SEO',
  security: 'Security',
  images: 'Images',
  testing: 'Testing',
  privacy: 'Privacy',
  pwa: 'PWA',
  i18n: 'Internationalisation'
}

export const CATEGORY_COLORS: Record<Category, string> = {
  html: '#e34c26',
  css: '#1572b6',
  javascript: '#f7df1e',
  performance: '#00c853',
  accessibility: '#4a148c',
  seo: '#ff6f00',
  security: '#d32f2f',
  images: '#00acc1',
  testing: '#4caf50',
  privacy: '#5c6bc0',
  pwa: '#673ab7',
  i18n: '#00897b'
}

/**
 * Check if a string is a valid category
 * @param category - The category string to validate
 * @returns True if valid category
 */
export function isValidCategory(category: string): category is Category {
  return CATEGORIES.includes(category as Category)
}
