'use client'

import { useSyncExternalStore } from 'react'

const reducedMotionQuery = '(prefers-reduced-motion: reduce)'

/**
 * Subscribe to reduced-motion preference changes.
 * @param onStoreChange - Callback invoked when the media query changes.
 * @returns Unsubscribe callback.
 */
function subscribeToReducedMotion(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(reducedMotionQuery)
  mediaQuery.addEventListener('change', onStoreChange)
  return () => mediaQuery.removeEventListener('change', onStoreChange)
}

/**
 * Read the client reduced-motion preference.
 * @returns Whether reduced motion is preferred.
 */
function getReducedMotionSnapshot() {
  return window.matchMedia(reducedMotionQuery).matches
}

/**
 * Return the server reduced-motion fallback.
 * @returns False during server rendering.
 */
function getServerReducedMotionSnapshot() {
  return false
}

/**
 * Track the user reduced-motion preference with a hydration-safe snapshot.
 * @returns Whether reduced motion is preferred.
 */
export function useReducedMotionPreference() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot
  )
}
