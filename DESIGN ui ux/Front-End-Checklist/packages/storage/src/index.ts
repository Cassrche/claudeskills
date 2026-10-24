import { CACHE, STORAGE_KEYS } from '@repo/config'
import { validateUserPreferences, validateUserProgress } from '@repo/schemas'
import type { StorageItem, UserPreferences, UserProgress } from '@repo/types'
import type { IDBPDatabase } from 'idb'
import {
  clearIndexedDbStores,
  deleteIndexedDbValue,
  initializeStorageDatabase,
  readIndexedDbValue,
  writeIndexedDbValue
} from './indexeddb-storage'
import {
  clearProjectLocalStorage,
  collectProjectLocalStorage,
  createStorageItem,
  reportStorageError
} from './storage-helpers'
import type { FECDatabase, IndexedDbStoreName, StorageExportData } from './storage-types'

/**
 * Browser storage abstraction for Front-End Checklist data.
 */
export class Storage {
  private static instance: Storage
  private db: IDBPDatabase<FECDatabase> | null = null
  private memoryCache: Map<string, any> = new Map()

  private constructor() {}

  /**
   * Return the shared storage singleton.
   *
   * @returns Storage instance used by the app.
   */
  static getInstance(): Storage {
    if (!Storage.instance) {
      Storage.instance = new Storage()
    }

    return Storage.instance
  }

  /**
   * Initialize IndexedDB when browser APIs are available.
   */
  async init(): Promise<void> {
    this.db = await initializeStorageDatabase()
  }

  /**
   * Persist a value to localStorage with cache metadata and in-memory fallback.
   *
   * @param key - Storage key.
   * @param value - Value to persist.
   * @param ttl - Optional time-to-live in milliseconds.
   */
  setLocal(key: string, value: unknown, ttl?: number): void {
    if (typeof window === 'undefined') {
      return
    }

    try {
      const item: StorageItem = createStorageItem(key, value, ttl)
      localStorage.setItem(key, JSON.stringify(item))
      this.memoryCache.set(key, value)
    } catch (error) {
      reportStorageError('LocalStorage write failed:', error)
      this.memoryCache.set(key, value)
    }
  }

  /**
   * Read a value from localStorage or the in-memory cache.
   *
   * @param key - Storage key.
   * @returns Stored value or null.
   */
  getLocal<T = any>(key: string): T | null {
    if (typeof window === 'undefined') {
      return null
    }

    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key)
    }

    try {
      const item = localStorage.getItem(key)
      if (!item) {
        return null
      }

      const parsed: StorageItem = JSON.parse(item)
      if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
        this.removeLocal(key)
        return null
      }

      if (parsed.version !== CACHE.VERSION) {
        this.removeLocal(key)
        return null
      }

      this.memoryCache.set(key, parsed.value)
      return parsed.value
    } catch (error) {
      reportStorageError('LocalStorage read failed:', error)
      return null
    }
  }

  /**
   * Remove a single localStorage key and its in-memory cache entry.
   *
   * @param key - Storage key.
   */
  removeLocal(key: string): void {
    if (typeof window === 'undefined') {
      return
    }

    try {
      localStorage.removeItem(key)
      this.memoryCache.delete(key)
    } catch (error) {
      reportStorageError('LocalStorage remove failed:', error)
    }
  }

  /**
   * Remove all Front-End Checklist localStorage entries.
   */
  clearLocal(): void {
    if (typeof window === 'undefined') {
      return
    }

    try {
      clearProjectLocalStorage(this.memoryCache)
    } catch (error) {
      reportStorageError('LocalStorage clear failed:', error)
    }
  }

  /**
   * Persist a value to sessionStorage.
   *
   * @param key - Storage key.
   * @param value - Value to persist.
   */
  setSession(key: string, value: unknown): void {
    if (typeof window === 'undefined') {
      return
    }

    try {
      sessionStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      reportStorageError('SessionStorage write failed:', error)
    }
  }

  /**
   * Read a value from sessionStorage.
   *
   * @param key - Storage key.
   * @returns Stored value or null.
   */
  getSession<T = any>(key: string): T | null {
    if (typeof window === 'undefined') {
      return null
    }

    try {
      const item = sessionStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch (error) {
      reportStorageError('SessionStorage read failed:', error)
      return null
    }
  }

  /**
   * Remove a value from sessionStorage.
   *
   * @param key - Storage key.
   */
  removeSession(key: string): void {
    if (typeof window === 'undefined') {
      return
    }

    try {
      sessionStorage.removeItem(key)
    } catch (error) {
      reportStorageError('SessionStorage remove failed:', error)
    }
  }

  /**
   * Set a cookie with an optional expiration window.
   *
   * @param name - Cookie name.
   * @param value - Cookie value.
   * @param days - Optional expiration window in days.
   */
  setCookie(name: string, value: string, days?: number): void {
    if (typeof window === 'undefined') {
      return
    }

    let expires = ''
    if (days) {
      const date = new Date()
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
      expires = `; expires=${date.toUTCString()}`
    }

    // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API is not available in all supported browsers.
    document.cookie = `${name}=${value || ''}${expires}; path=/; SameSite=Strict`
  }

  /**
   * Read a cookie value by name.
   *
   * @param name - Cookie name.
   * @returns Cookie value or null.
   */
  getCookie(name: string): string | null {
    if (typeof window === 'undefined') {
      return null
    }

    const nameEQ = `${name}=`
    const cookies = document.cookie.split(';')

    for (let cookie of cookies) {
      cookie = cookie.trim()
      if (cookie.indexOf(nameEQ) === 0) {
        return cookie.substring(nameEQ.length)
      }
    }

    return null
  }

  /**
   * Remove a cookie by expiring it immediately.
   *
   * @param name - Cookie name.
   */
  removeCookie(name: string): void {
    if (typeof window === 'undefined') {
      return
    }

    this.setCookie(name, '', -1)
  }

  /**
   * Persist a value to one of the managed IndexedDB stores.
   *
   * @param store - Store name.
   * @param key - Entry key.
   * @param value - Store value.
   */
  async setIndexedDB<K extends IndexedDbStoreName>(
    store: K,
    key: string,
    value: FECDatabase[K]['value']
  ): Promise<void> {
    if (!this.db) {
      await this.init()
    }
    if (!this.db) {
      throw new Error('IndexedDB not available')
    }

    await writeIndexedDbValue(this.db, store, key, value)
  }

  /**
   * Read a value from one of the managed IndexedDB stores.
   *
   * @param store - Store name.
   * @param key - Entry key.
   * @returns Stored value or null.
   */
  async getIndexedDB<K extends IndexedDbStoreName>(
    store: K,
    key: string
  ): Promise<FECDatabase[K]['value'] | null> {
    if (!this.db) {
      await this.init()
    }
    if (!this.db) {
      return null
    }

    return readIndexedDbValue(this.db, store, key)
  }

  /**
   * Remove a value from one of the managed IndexedDB stores.
   *
   * @param store - Store name.
   * @param key - Entry key.
   */
  async removeIndexedDB<K extends IndexedDbStoreName>(store: K, key: string): Promise<void> {
    if (!this.db) {
      await this.init()
    }
    if (!this.db) {
      return
    }

    await deleteIndexedDbValue(this.db, store, key)
  }

  /**
   * Clear one store or all managed IndexedDB stores.
   *
   * @param store - Optional single store to clear.
   */
  async clearIndexedDB(store?: IndexedDbStoreName): Promise<void> {
    if (!this.db) {
      await this.init()
    }
    if (!this.db) {
      return
    }

    await clearIndexedDbStores(this.db, store)
  }

  /**
   * Validate and persist user progress.
   *
   * @param progress - Progress records to save.
   */
  async saveProgress(progress: UserProgress[]): Promise<void> {
    const validProgress = progress.filter(
      progressItem => validateUserProgress(progressItem).success
    )
    await this.setIndexedDB('progress', 'all', validProgress)
    this.setLocal(STORAGE_KEYS.USER_PROGRESS, validProgress, CACHE.TTL.USER_DATA)
  }

  /**
   * Load user progress from local cache first, then IndexedDB.
   *
   * @returns Persisted progress records.
   */
  async loadProgress(): Promise<UserProgress[]> {
    const cached = this.getLocal<UserProgress[]>(STORAGE_KEYS.USER_PROGRESS)
    if (cached) {
      return cached
    }

    const stored = await this.getIndexedDB('progress', 'all')
    if (stored) {
      this.setLocal(STORAGE_KEYS.USER_PROGRESS, stored, CACHE.TTL.USER_DATA)
      return stored
    }

    return []
  }

  /**
   * Validate and persist user preferences.
   *
   * @param preferences - Preferences payload to save.
   */
  async savePreferences(preferences: UserPreferences): Promise<void> {
    const validation = validateUserPreferences(preferences)
    if (!validation.success) {
      throw new Error('Invalid preferences')
    }

    await this.setIndexedDB('preferences', 'current', preferences)
    this.setLocal(STORAGE_KEYS.USER_PREFERENCES, preferences)
  }

  /**
   * Load user preferences from local cache first, then IndexedDB.
   *
   * @returns Persisted preferences or null.
   */
  async loadPreferences(): Promise<UserPreferences | null> {
    const cached = this.getLocal<UserPreferences>(STORAGE_KEYS.USER_PREFERENCES)
    if (cached) {
      return cached
    }

    const stored = await this.getIndexedDB('preferences', 'current')
    if (stored) {
      this.setLocal(STORAGE_KEYS.USER_PREFERENCES, stored)
      return stored
    }

    return null
  }

  /**
   * Estimate current browser storage usage and quota.
   *
   * @returns Storage usage and quota in bytes.
   */
  async getStorageSize(): Promise<{ used: number; quota: number }> {
    if (typeof window === 'undefined' || !navigator.storage?.estimate) {
      return { used: 0, quota: 0 }
    }

    try {
      const estimate = await navigator.storage.estimate()
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0
      }
    } catch {
      return { used: 0, quota: 0 }
    }
  }

  /**
   * Request persistent browser storage when supported.
   *
   * @returns True when persistence is granted.
   */
  async requestPersistence(): Promise<boolean> {
    if (typeof window === 'undefined' || !navigator.storage?.persist) {
      return false
    }

    try {
      return await navigator.storage.persist()
    } catch {
      return false
    }
  }

  /**
   * Export all persisted user-facing data.
   *
   * @returns Snapshot of progress, preferences, and Front-End Checklist localStorage entries.
   */
  async exportAllData(): Promise<StorageExportData> {
    const progress = await this.loadProgress()
    const preferences = await this.loadPreferences()
    const localStorage = typeof window !== 'undefined' ? collectProjectLocalStorage() : {}

    return { progress, preferences, localStorage }
  }

  /**
   * Clear all persisted Front-End Checklist data from IndexedDB, localStorage, and cookies.
   */
  async clearAllData(): Promise<void> {
    await this.clearIndexedDB()
    this.clearLocal()

    if (typeof window !== 'undefined') {
      document.cookie.split(';').forEach(cookie => {
        const [name] = cookie.split('=')
        if (name.trim().startsWith('fec_')) {
          this.removeCookie(name.trim())
        }
      })
    }
  }
}

/** Shared storage singleton used throughout the app. */
export const storage = Storage.getInstance()
/** Persist user progress through the shared storage singleton. */
export const saveProgress = (progress: UserProgress[]) => storage.saveProgress(progress)
/** Load persisted user progress through the shared storage singleton. */
export const loadProgress = () => storage.loadProgress()
/** Persist user preferences through the shared storage singleton. */
export const savePreferences = (preferences: UserPreferences) =>
  storage.savePreferences(preferences)
/** Load persisted user preferences through the shared storage singleton. */
export const loadPreferences = () => storage.loadPreferences()
/** Clear all persisted Front-End Checklist data through the shared storage singleton. */
export const clearAllData = () => storage.clearAllData()
/** Export all persisted Front-End Checklist data through the shared storage singleton. */
export const exportAllData = () => storage.exportAllData()
