'use client'

import { useSyncExternalStore } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Subscribe to reduced-motion preference changes.
 *
 * @param onStoreChange - Callback invoked when the media query changes.
 * @returns Unsubscribe callback.
 */
function subscribeToReducedMotion(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY)
  mediaQuery.addEventListener('change', onStoreChange)
  return () => mediaQuery.removeEventListener('change', onStoreChange)
}

/**
 * Read the current client reduced-motion preference.
 *
 * @returns Whether the user prefers reduced motion.
 */
function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

/**
 * Return the server fallback used for the first hydration pass.
 *
 * @returns False during server rendering and hydration.
 */
function getServerReducedMotionSnapshot() {
  return false
}

/**
 * Track reduced-motion preference without changing markup during hydration.
 *
 * @returns Whether the user prefers reduced motion.
 */
export function useReducedMotionPreference() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot
  )
}
