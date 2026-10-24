import type { IDBPDatabase } from 'idb'
import { openDB } from 'idb'
import { reportStorageError } from './storage-helpers'
import type { FECDatabase, IndexedDbStoreName } from './storage-types'

/**
 * Create or open the Front-End Checklist IndexedDB database.
 *
 * @returns Opened IndexedDB handle, or null when IndexedDB is unavailable.
 */
export async function initializeStorageDatabase(): Promise<IDBPDatabase<FECDatabase> | null> {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return await openDB<FECDatabase>('front-end-checklist', 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('progress')) {
          database.createObjectStore('progress')
        }
        if (!database.objectStoreNames.contains('preferences')) {
          database.createObjectStore('preferences')
        }
        if (!database.objectStoreNames.contains('cache')) {
          database.createObjectStore('cache')
        }
      }
    })
  } catch (error) {
    reportStorageError('Failed to initialize IndexedDB:', error)
    return null
  }
}

/**
 * Persist a value to an IndexedDB store.
 *
 * @param db - Opened IndexedDB handle.
 * @param store - Store name.
 * @param key - Entry key.
 * @param value - Value to persist.
 */
export async function writeIndexedDbValue<K extends IndexedDbStoreName>(
  db: IDBPDatabase<FECDatabase>,
  store: K,
  key: string,
  value: FECDatabase[K]['value']
) {
  try {
    await db.put(store, value, key)
  } catch (error) {
    reportStorageError('IndexedDB write failed:', error)
    throw error
  }
}

/**
 * Read a value from an IndexedDB store.
 *
 * @param db - Opened IndexedDB handle.
 * @param store - Store name.
 * @param key - Entry key.
 * @returns Stored value or null.
 */
export async function readIndexedDbValue<K extends IndexedDbStoreName>(
  db: IDBPDatabase<FECDatabase>,
  store: K,
  key: string
): Promise<FECDatabase[K]['value'] | null> {
  try {
    const value = await db.get(store, key)
    return value ?? null
  } catch (error) {
    reportStorageError('IndexedDB read failed:', error)
    return null
  }
}

/**
 * Remove a value from an IndexedDB store.
 *
 * @param db - Opened IndexedDB handle.
 * @param store - Store name.
 * @param key - Entry key.
 */
export async function deleteIndexedDbValue<K extends IndexedDbStoreName>(
  db: IDBPDatabase<FECDatabase>,
  store: K,
  key: string
) {
  try {
    await db.delete(store, key)
  } catch (error) {
    reportStorageError('IndexedDB delete failed:', error)
  }
}

/**
 * Clear one store or all IndexedDB stores managed by this package.
 *
 * @param db - Opened IndexedDB handle.
 * @param store - Optional single store to clear.
 */
export async function clearIndexedDbStores(
  db: IDBPDatabase<FECDatabase>,
  store?: IndexedDbStoreName
) {
  try {
    if (store) {
      await db.clear(store)
      return
    }

    await db.clear('progress')
    await db.clear('preferences')
    await db.clear('cache')
  } catch (error) {
    reportStorageError('IndexedDB clear failed:', error)
  }
}
