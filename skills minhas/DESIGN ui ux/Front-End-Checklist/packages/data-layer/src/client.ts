import { CACHE } from '@repo/config'
import { storage } from '@repo/storage'
import { QueryClient } from '@tanstack/react-query'
import {
  type PersistedClient,
  type Persister,
  persistQueryClient
} from '@tanstack/react-query-persist-client'

/**
 * Validate that an unknown persisted cache payload matches React Query's persisted-client shape.
 *
 * @param value - Unknown cached payload loaded from storage.
 * @returns True when the payload can be restored as a persisted query client.
 */
function isPersistedClient(value: unknown): value is PersistedClient {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const timestamp = Reflect.get(value, 'timestamp')
  const buster = Reflect.get(value, 'buster')
  const clientState = Reflect.get(value, 'clientState')

  return (
    typeof timestamp === 'number' &&
    typeof buster === 'string' &&
    typeof clientState === 'object' &&
    clientState !== null
  )
}

// Create a custom persister using our storage layer
const createPersister = (): Persister => ({
  persistClient: async (client: PersistedClient) => {
    await storage.setIndexedDB('cache', 'query-client', client)
  },
  restoreClient: async () => {
    const data = await storage.getIndexedDB('cache', 'query-client')
    return isPersistedClient(data) ? data : undefined
  },
  removeClient: async () => {
    await storage.removeIndexedDB('cache', 'query-client')
  }
})

// Default query client configuration
export const defaultQueryClientOptions = {
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours (formerly cacheTime)
      retry: 3,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true
    },
    mutations: {
      retry: 2,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000)
    }
  }
}

/**
 * makeQueryClient function.
 */
function makeQueryClient() {
  return new QueryClient(defaultQueryClientOptions)
}

let browserQueryClient: QueryClient | undefined

/**
 * Returns a fresh QueryClient on the server (isolating requests) and a
 * stable singleton on the client. This avoids sharing cached query state
 * across SSR requests, which is a common source of hydration mismatches.
 */
export function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient()
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient()
  }
  return browserQueryClient
}

// Initialize persistence (client-only)
/**
 * initializeQueryClient function.
 */
export async function initializeQueryClient(clientOverride?: QueryClient) {
  if (typeof window !== 'undefined') {
    const client = clientOverride ?? getQueryClient()
    await storage.init()

    await persistQueryClient({
      queryClient: client,
      persister: createPersister(),
      maxAge: CACHE.TTL.DEFAULT,
      buster: CACHE.VERSION
    })
  }
}

// Query keys factory for consistent key generation
export const queryKeys = {
  all: ['rules'] as const,
  lists: () => [...queryKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...queryKeys.lists(), filters] as const,
  details: () => [...queryKeys.all, 'detail'] as const,
  detail: (slug: string) => [...queryKeys.details(), slug] as const,
  byCategory: (category: string) => [...queryKeys.all, 'category', category] as const,
  byPriority: (priority: string) => [...queryKeys.all, 'priority', priority] as const,
  search: (query: string) => [...queryKeys.all, 'search', query] as const,
  progress: () => ['progress'] as const,
  preferences: () => ['preferences'] as const
} as const

// Mutation keys factory
export const mutationKeys = {
  updateProgress: () => ['updateProgress'] as const,
  updatePreferences: () => ['updatePreferences'] as const,
  toggleRule: () => ['toggleRule'] as const,
  bulkUpdateRules: () => ['bulkUpdateRules'] as const,
  exportData: () => ['exportData'] as const,
  importData: () => ['importData'] as const
} as const
