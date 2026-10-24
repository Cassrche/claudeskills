import type { UserPreferences, UserProgress } from '@repo/types'
import type { DBSchema } from 'idb'

/**
 * IndexedDB schema used by the storage package.
 */
export interface FECDatabase extends DBSchema {
  progress: {
    key: string
    value: UserProgress[]
  }
  preferences: {
    key: string
    value: UserPreferences
  }
  cache: {
    key: string
    value: unknown
  }
}

/**
 * Valid IndexedDB store names managed by the storage package.
 */
export type IndexedDbStoreName = 'progress' | 'preferences' | 'cache'

/**
 * Payload returned when exporting all persisted Front-End Checklist data.
 */
export interface StorageExportData {
  progress: UserProgress[]
  preferences: UserPreferences | null
  localStorage: Record<string, unknown>
}
