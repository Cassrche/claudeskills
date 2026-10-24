import type { SupportedLocale } from './types'

/**
 * Get the native name of a locale
 */
export function getNativeName(locale: SupportedLocale): string {
  const names: Record<SupportedLocale, string> = {
    en: 'English',
    fr: 'Français',
    es: 'Español',
    de: 'Deutsch',
    it: 'Italiano',
    pt: 'Português',
    ja: '日本語',
    zh: '中文',
    ko: '한국어',
    ru: 'Русский',
    ar: 'العربية',
    he: 'עברית',
    fa: 'فارسی',
    ur: 'اردو'
  }
  return names[locale] || locale
}

/**
 * Check if a locale uses right-to-left text
 */
export function isRTL(locale: SupportedLocale): boolean {
  const rtlLocales: SupportedLocale[] = ['ar', 'he', 'fa', 'ur']
  return rtlLocales.includes(locale)
}

/**
 * Format a date according to locale
 */
export function formatDate(date: Date, locale: SupportedLocale): string {
  return new Intl.DateTimeFormat(locale).format(date)
}

/**
 * Format relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(date: Date, locale: SupportedLocale): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const diff = (date.getTime() - Date.now()) / 1000 // difference in seconds

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
    ['second', 1]
  ]

  for (const [unit, seconds] of units) {
    if (Math.abs(diff) >= seconds) {
      return rtf.format(Math.round(diff / seconds), unit)
    }
  }

  return rtf.format(0, 'second')
}

/**
 * Get plural form based on count
 */
export function getPlural(count: number, locale: SupportedLocale): Intl.LDMLPluralRule {
  const pr = new Intl.PluralRules(locale)
  return pr.select(count)
}
