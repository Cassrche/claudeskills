'use client'

import { useSyncExternalStore } from 'react'

/**
 * Subscribe to a stable hydration store.
 * @returns An unsubscribe callback for useSyncExternalStore.
 */
function subscribeToHydrationStore() {
  return () => {}
}

/**
 * Return the client hydration snapshot.
 * @returns True after the client store is available.
 */
function getHydratedSnapshot() {
  return true
}

/**
 * Return the server hydration snapshot.
 * @returns False during server rendering.
 */
function getServerHydratedSnapshot() {
  return false
}

/**
 * Return false during SSR and the first hydration comparison, then true on the client.
 * @returns Whether the component has hydrated on the client.
 */
export function useHydrated() {
  return useSyncExternalStore(
    subscribeToHydrationStore,
    getHydratedSnapshot,
    getServerHydratedSnapshot
  )
}
