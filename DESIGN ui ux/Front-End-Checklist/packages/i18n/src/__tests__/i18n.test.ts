jest.mock('@repo/storage', () => ({
  loadPreferences: jest.fn(),
  savePreferences: jest.fn()
}))

import { loadPreferences, savePreferences } from '@repo/storage'
import i18n from 'i18next'
import {
  changeLanguage,
  formatDate,
  formatRelativeTime,
  getAvailableLanguages,
  getCurrentLanguage,
  getNativeName,
  getPlural,
  initI18n,
  isRTL,
  loadTranslations
} from '../index'

describe('@repo/i18n', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(loadPreferences as jest.Mock).mockResolvedValue({
      locale: 'fr',
      theme: 'dark',
      selectedCategories: [],
      selectedPriorities: [],
      showCompleted: true,
      sortBy: 'priority',
      sortOrder: 'asc'
    })
  })

  it('initializes i18n using stored preferences', async () => {
    await initI18n()
    expect(getCurrentLanguage()).toBe('fr')
    expect(getAvailableLanguages()).toContain('en')
  })

  it('changes language and persists the selection', async () => {
    await initI18n()
    await changeLanguage('es')

    expect(i18n.language).toBe('es')
    expect(savePreferences).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'es', theme: 'dark' })
    )
  })

  it('falls back to defaults when no stored preferences exist', async () => {
    ;(loadPreferences as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce(null)

    await initI18n()
    await changeLanguage('en')

    expect(savePreferences).toHaveBeenCalledWith({
      locale: 'en',
      theme: 'system',
      selectedCategories: [],
      selectedPriorities: [],
      showCompleted: false,
      sortBy: 'priority',
      sortOrder: 'asc'
    })
  })

  it('loads translations and exposes locale helpers', async () => {
    await loadTranslations('en', 'custom', { hello: 'world' })
    expect(i18n.getResourceBundle('en', 'custom')).toEqual({ hello: 'world' })

    expect(getNativeName('fr')).toBe('Français')
    expect(getNativeName('xx' as any)).toBe('xx')
    expect(isRTL('ar')).toBe(true)
    expect(isRTL('en')).toBe(false)
    expect(getPlural(2, 'en')).toBe('other')
  })

  it('formats dates and relative time for locales', () => {
    const date = new Date('2026-03-10T00:00:00Z')
    expect(formatDate(date, 'en')).toContain('3')
    expect(typeof formatRelativeTime(new Date(Date.now() - 60_000), 'en')).toBe('string')
    expect(typeof formatRelativeTime(new Date(), 'en')).toBe('string')
  })
})
