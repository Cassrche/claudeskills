'use client'

import type { RefObject } from 'react'
import { useRef, useSyncExternalStore } from 'react'

/**
 * Observe whether an element is in the viewport without effect-driven state updates.
 * @param ref - Element ref to observe.
 * @param threshold - Intersection threshold.
 * @returns Whether the element is currently intersecting.
 */
export function useIntersectionInView(ref: RefObject<HTMLElement | null>, threshold: number) {
  const storeRef = useRef({ isInView: false })

  return useSyncExternalStore(
    onStoreChange => {
      const element = ref.current
      if (!element || typeof IntersectionObserver === 'undefined') {
        return () => {}
      }

      const observer = new IntersectionObserver(
        ([entry]) => {
          storeRef.current.isInView = entry.isIntersecting
          onStoreChange()
        },
        { threshold }
      )

      observer.observe(element)
      return () => observer.disconnect()
    },
    () => storeRef.current.isInView,
    () => false
  )
}
