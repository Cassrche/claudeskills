import type { AppConfig } from '@repo/types'
import { FEATURES } from './features'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './locales'

// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.frontendchecklist.io'
export const API_VERSION = 'v1'
export const API_TIMEOUT = 30000 // 30 seconds

// App Configuration
export const APP_NAME = 'Front-End Checklist'
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
export const APP_DESCRIPTION =
  'The Front-End Checklist is an exhaustive list of all elements you need to have / to test before launching your website / application to production.'

// Default app configuration
export const DEFAULT_CONFIG: AppConfig = {
  apiUrl: API_BASE_URL,
  analyticsId: undefined,
  sentryDsn: undefined,
  features: FEATURES,
  defaultLocale: DEFAULT_LOCALE,
  supportedLocales: [...SUPPORTED_LOCALES]
}

/**
 * Get a configuration value by key with environment variable override
 * @param key - The configuration key
 * @returns The configuration value
 */
export function getConfig<K extends keyof AppConfig>(key: K): AppConfig[K] {
  const envKey = `NEXT_PUBLIC_${key
    .toUpperCase()
    .replace(/([A-Z])/g, '_$1')
    .slice(1)}`
  const envValue = process.env[envKey]

  if (envValue !== undefined) {
    try {
      return JSON.parse(envValue) as AppConfig[K]
    } catch {
      return envValue as AppConfig[K]
    }
  }

  return DEFAULT_CONFIG[key]
}
