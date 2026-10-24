import { DEFAULT_CONFIG } from '@repo/config'
import { loadPreferences, savePreferences } from '@repo/storage'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en, es, fr } from './translations'
import type { SupportedLocale } from './types'
import { formatDate, formatRelativeTime, getNativeName, getPlural, isRTL } from './utils'

// Resource bundle
const resources = {
  en,
  fr,
  es
}

/**
 * Initialize i18next with configuration and resources
 */
export async function initI18n(): Promise<void> {
  // Get saved language from storage
  const preferences = await loadPreferences()
  const savedLanguage = preferences?.locale

  await i18n.use(initReactI18next).init({
    resources,
    lng: savedLanguage || DEFAULT_CONFIG.defaultLocale,
    fallbackLng: DEFAULT_CONFIG.defaultLocale,
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    }
  })
}

/**
 * Change the current language
 */
export async function changeLanguage(locale: string): Promise<void> {
  await i18n.changeLanguage(locale)

  // Save to storage
  const preferences = await loadPreferences()
  await savePreferences({
    ...(preferences || {}),
    locale,
    theme: preferences?.theme || 'system',
    selectedCategories: preferences?.selectedCategories || [],
    selectedPriorities: preferences?.selectedPriorities || [],
    showCompleted: preferences?.showCompleted ?? false,
    sortBy: preferences?.sortBy || 'priority',
    sortOrder: preferences?.sortOrder || 'asc'
  })
}

/**
 * Get the current language
 */
export function getCurrentLanguage(): string {
  return i18n.language
}

/**
 * Get available languages
 */
export function getAvailableLanguages(): SupportedLocale[] {
  return Object.keys(resources) as any
}

/**
 * Load additional translations dynamically
 */
export async function loadTranslations(
  locale: SupportedLocale,
  namespace: string,
  translations: any
): Promise<void> {
  i18n.addResourceBundle(locale, namespace, translations, true, true)
}

// Export types
export type { SupportedLocale }
// Export utilities
// Export the i18n instance
export { formatDate, formatRelativeTime, getNativeName, getPlural, i18n, isRTL }

// Default export for convenience
export default i18n
