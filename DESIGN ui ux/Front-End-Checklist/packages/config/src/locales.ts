export const DEFAULT_LOCALE = 'en'
export const SUPPORTED_LOCALES = ['en'] as const

export const LOCALE_LABELS: Record<string, string> = {
  en: 'English'
}

/**
 * Check if a string is a valid locale
 * @param locale - The locale string to validate
 * @returns True if valid locale
 */
export function isValidLocale(locale: string): boolean {
  return SUPPORTED_LOCALES.includes(locale as (typeof SUPPORTED_LOCALES)[number])
}
