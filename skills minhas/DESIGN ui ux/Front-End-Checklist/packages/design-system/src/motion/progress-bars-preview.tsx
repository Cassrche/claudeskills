'use client'

import { domAnimation, LazyMotion, m } from 'framer-motion'
import { useReducedMotionPreference } from './reduced-motion-preference'

interface ProgressBarsPreviewProps {
  className?: string
  isHovered?: boolean
}

const bars = [
  { id: 'bar-95', targetWidth: 95, fillOpacity: 0.6 },
  { id: 'bar-55', targetWidth: 55, fillOpacity: 0.5 },
  { id: 'bar-82', targetWidth: 82, fillOpacity: 0.55 },
  { id: 'bar-38', targetWidth: 38, fillOpacity: 0.45 },
  { id: 'bar-70', targetWidth: 70, fillOpacity: 0.5 }
]

/**
 * Render decorative progress bars for loading and audit visuals.
 * @param props - Component styling props.
 */
export function ProgressBarsPreview({ className = '' }: ProgressBarsPreviewProps) {
  const prefersReducedMotion = useReducedMotionPreference()

  if (prefersReducedMotion) {
    return (
      <div className={`flex h-full w-full flex-col justify-center gap-3 ${className}`}>
        {bars.map(bar => (
          <div
            key={bar.id}
            className="relative h-2.5 w-full overflow-hidden rounded-full bg-accent/10"
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${bar.targetWidth}%`,
                backgroundColor: `color-mix(in oklch, var(--accent) ${bar.fillOpacity * 100}%, transparent)`
              }}
            />
          </div>
        ))}
      </div>
    )
  }

  return (
    <LazyMotion features={domAnimation}>
      <div className={`flex h-full w-full flex-col justify-center gap-3 ${className}`}>
        {bars.map((bar, index) => (
          <div
            key={bar.id}
            className="relative h-2.5 w-full overflow-hidden rounded-full bg-accent/10"
          >
            <m.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                backgroundColor: `color-mix(in oklch, var(--accent) ${bar.fillOpacity * 100}%, transparent)`
              }}
              initial={{ width: '0%' }}
              animate={{ width: `${bar.targetWidth}%` }}
              transition={{
                duration: 1.5,
                delay: index * 0.15,
                ease: [0.4, 0, 0.2, 1]
              }}
            />
          </div>
        ))}
      </div>
    </LazyMotion>
  )
}
