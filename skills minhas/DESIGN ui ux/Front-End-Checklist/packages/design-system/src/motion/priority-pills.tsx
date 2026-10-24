'use client'

import { domAnimation, LazyMotion, m } from 'framer-motion'
import { useReducedMotionPreference } from './reduced-motion-preference'

interface PriorityPillsProps {
  className?: string
  isHovered?: boolean
}

const priorities = [
  {
    label: 'Critical',
    bgClass: 'bg-priority-critical-bg',
    textClass: 'text-priority-critical-text',
    dotClass: 'bg-priority-critical-text'
  },
  {
    label: 'High',
    bgClass: 'bg-priority-high-bg',
    textClass: 'text-priority-high-text',
    dotClass: 'bg-priority-high-text'
  },
  {
    label: 'Medium',
    bgClass: 'bg-priority-medium-bg',
    textClass: 'text-priority-medium-text',
    dotClass: 'bg-priority-medium-text'
  },
  {
    label: 'Low',
    bgClass: 'bg-priority-low-bg',
    textClass: 'text-priority-low-text',
    dotClass: 'bg-priority-low-text'
  }
] as const

/**
 * Render animated priority pills used in marketing surfaces.
 * @param props - Component styling props.
 */
export function PriorityPills({ className = '' }: PriorityPillsProps) {
  const prefersReducedMotion = useReducedMotionPreference()

  if (prefersReducedMotion) {
    return (
      <div
        className={`flex h-full w-full flex-wrap items-center justify-center gap-3 ${className}`}
      >
        {priorities.map(priority => (
          <div
            key={priority.label}
            className={`flex items-center gap-2 rounded-full px-3.5 py-2 font-semibold text-[13px] ${priority.bgClass} ${priority.textClass}`}
          >
            <div className={`size-2 rounded-full ${priority.dotClass}`} />
            {priority.label}
          </div>
        ))}
      </div>
    )
  }

  return (
    <LazyMotion features={domAnimation}>
      <div
        className={`flex h-full w-full flex-wrap items-center justify-center gap-3 ${className}`}
      >
        {priorities.map((priority, index) => (
          <m.div
            key={priority.label}
            className={`flex items-center gap-2 rounded-full px-3.5 py-2 font-semibold text-[13px] ${priority.bgClass} ${priority.textClass}`}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0
            }}
            transition={{
              duration: 0.4,
              delay: index * 0.1,
              ease: [0.34, 1.56, 0.64, 1]
            }}
          >
            <m.div
              className={`size-2 rounded-full ${priority.dotClass}`}
              animate={{
                scale: [1, 1.4, 1],
                opacity: [1, 0.6, 1]
              }}
              transition={{
                duration: 2,
                delay: index * 0.3,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
            {priority.label}
          </m.div>
        ))}
      </div>
    </LazyMotion>
  )
}
