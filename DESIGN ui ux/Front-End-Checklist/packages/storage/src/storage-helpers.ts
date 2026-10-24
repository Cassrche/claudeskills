import { CACHE, STORAGE_KEYS } from '@repo/config'
import type { StorageItem } from '@repo/types'

const knownStorageKeys = new Set<string>(Object.values(STORAGE_KEYS))

/**
 * Determine whether a key belongs to the Front-End Checklist storage namespace.
 *
 * @param key - Storage key to inspect.
 * @returns True when the key should be managed by this package.
 */
export function isProjectStorageKey(key: string): boolean {
  return key.startsWith('fec_') || knownStorageKeys.has(key)
}

/**
 * Check whether storage errors should be suppressed for the current environment.
 *
 * @returns True in test mode, where missing browser storage is expected.
 */
export function shouldSuppressStorageErrors(): boolean {
  return process.env.NODE_ENV === 'test'
}

/**
 * Report a storage-layer error unless the current environment intentionally suppresses it.
 *
 * @param message - Error summary.
 * @param error - Original thrown value.
 */
export function reportStorageError(message: string, error: unknown) {
  if (shouldSuppressStorageErrors()) {
    return
  }

  console.error(message, error)
}

/**
 * Build a serialized localStorage payload with cache metadata.
 *
 * @param key - Storage key.
 * @param value - Value to persist.
 * @param ttl - Optional time-to-live in milliseconds.
 * @returns Storage wrapper persisted in localStorage.
 */
export function createStorageItem(key: string, value: unknown, ttl?: number): StorageItem {
  return {
    key,
    value,
    expiresAt: ttl ? new Date(Date.now() + ttl) : undefined,
    version: CACHE.VERSION
  }
}

/**
 * Remove all Front-End Checklist localStorage keys and matching in-memory cache entries.
 *
 * @param memoryCache - In-memory cache mirror to clear.
 */
export function clearProjectLocalStorage(memoryCache: Map<string, unknown>) {
  const keysToRemove: string[] = []
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (key && isProjectStorageKey(key)) {
      keysToRemove.push(key)
    }
  }

  for (const key of keysToRemove) {
    localStorage.removeItem(key)
  }

  for (const key of Array.from(memoryCache.keys())) {
    if (isProjectStorageKey(key)) {
      memoryCache.delete(key)
    }
  }
}

/**
 * Collect Front-End Checklist localStorage entries for export.
 *
 * @returns Parsed localStorage entries keyed by storage name.
 */
export function collectProjectLocalStorage(): Record<string, unknown> {
  const exported: Record<string, unknown> = {}

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (!key?.startsWith('fec_')) {
      continue
    }

    try {
      const value = window.localStorage.getItem(key)
      if (value) {
        exported[key] = JSON.parse(value)
      }
    } catch {
      // Skip malformed values during export.
    }
  }

  return exported
}
