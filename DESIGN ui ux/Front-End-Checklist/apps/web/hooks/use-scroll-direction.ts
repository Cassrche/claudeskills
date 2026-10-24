'use client'

import { useEffect, useRef, useState } from 'react'

type ScrollDirection = 'down' | 'up'

/**
 * Returns the current scroll direction based on vertical scroll position.
 * Uses requestAnimationFrame and a configurable threshold to avoid jitter.
 * @param threshold - Minimum scroll delta in pixels before direction updates (default 10).
 * @returns 'up' when scrolling up or at top of page, 'down' when scrolling down.
 */
export function useScrollDirection(threshold = 10): ScrollDirection {
  const [direction, setDirection] = useState<ScrollDirection>('up')
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  useEffect(() => {
    lastScrollY.current = window.scrollY

    /**
     * Compare the current scroll offset with the previous offset and update direction state.
     */
    const updateDirection = () => {
      const scrollY = window.scrollY
      if (scrollY <= 0) {
        setDirection('up')
        lastScrollY.current = 0
        ticking.current = false
        return
      }
      if (Math.abs(scrollY - lastScrollY.current) < threshold) {
        ticking.current = false
        return
      }
      setDirection(scrollY > lastScrollY.current ? 'down' : 'up')
      lastScrollY.current = scrollY
      ticking.current = false
    }

    /**
     * Queue a direction recalculation on the next animation frame.
     */
    const onScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(updateDirection)
        ticking.current = true
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  return direction
}
