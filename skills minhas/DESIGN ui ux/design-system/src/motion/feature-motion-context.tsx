'use client'

import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'

/**
 * Shared animation context for unified breathing rhythm across bento cards.
 * All cards reference the same breath phase to feel like a "unified organism".
 *
 * BREATH_CYCLE: 4 seconds for full cycle (in/out)
 * breathPhase: 0 to 1 value representing current position in breath cycle
 */

const BREATH_CYCLE = 4000 // 4 seconds

interface FeatureMotionContextValue {
  breathPhase: number // 0 to 1
  isInView: boolean
  setIsInView: (value: boolean) => void
}

const FeatureMotionContext = createContext<FeatureMotionContextValue>({
  breathPhase: 0.5,
  isInView: false,
  setIsInView: () => {}
})

/**
 * Provide shared animation state for the bento motion components.
 *
 * @param props - Children that should consume the shared animation rhythm.
 * @returns Context provider wrapping the animated subtree.
 */
export function FeatureMotionProvider({ children }: { children: ReactNode }) {
  const [breathPhase, setBreathPhase] = useState(0.5)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    // Use CSS animation timing instead of RAF for performance
    const startTime = performance.now()

    /**
     * Update the breathing phase for the next animation frame.
     */
    const updateBreath = () => {
      const elapsed = performance.now() - startTime
      const t = (elapsed % BREATH_CYCLE) / BREATH_CYCLE
      // Sine wave: 0 → 1 → 0 (smooth breathing)
      const phase = Math.sin(t * Math.PI * 2) * 0.5 + 0.5
      setBreathPhase(phase)
      requestAnimationFrame(updateBreath)
    }

    const frameId = requestAnimationFrame(updateBreath)
    return () => cancelAnimationFrame(frameId)
  }, [])

  return (
    <FeatureMotionContext.Provider value={{ breathPhase, isInView, setIsInView }}>
      {children}
    </FeatureMotionContext.Provider>
  )
}

/**
 * Read the shared bento animation context.
 *
 * @returns Shared breathing phase and viewport animation state.
 */
export function useFeatureMotion() {
  return useContext(FeatureMotionContext)
}

/**
 * CSS variables for animation colors.
 * Apply these to the bento grid container.
 */
export const featureMotionVars = {
  light: {
    '--anim-primary': 'var(--accent)',
    '--anim-primary-soft': 'color-mix(in oklch, var(--accent) 6%, transparent)',
    '--anim-primary-medium': 'color-mix(in oklch, var(--accent) 25%, transparent)',
    '--anim-success': 'var(--success)',
    '--anim-warning': 'var(--warning)',
    '--anim-critical': 'var(--destructive)'
  },
  dark: {
    '--anim-primary': 'var(--accent)',
    '--anim-primary-soft': 'color-mix(in oklch, var(--accent) 8%, transparent)',
    '--anim-primary-medium': 'color-mix(in oklch, var(--accent) 30%, transparent)',
    '--anim-glow': 'color-mix(in oklch, var(--accent) 20%, transparent)',
    '--anim-success': 'var(--success)',
    '--anim-warning': 'var(--warning)',
    '--anim-critical': 'var(--destructive)'
  }
}

/**
 * CSS easing functions matching the spec
 */
export const easings = {
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  linear: 'linear'
}
