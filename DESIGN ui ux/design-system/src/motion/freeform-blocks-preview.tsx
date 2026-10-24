'use client'

import { domAnimation, LazyMotion, m } from 'framer-motion'
import { Layers, PenTool, Plus, Sliders } from 'lucide-react'
import { useReducedMotionPreference } from './reduced-motion-preference'

interface FreeformBlocksPreviewProps {
  className?: string
  isHovered?: boolean
}

const blocks = [
  { icon: Plus, x: 18, y: 25, rotate: -5, size: 44 },
  { icon: Layers, x: 60, y: 20, rotate: 8, size: 40 },
  { icon: PenTool, x: 30, y: 65, rotate: -3, size: 42 },
  { icon: Sliders, x: 72, y: 60, rotate: 6, size: 38 }
]

/**
 * Render floating freeform blocks to illustrate customizable workflows.
 * @param props - Component styling props.
 */
export function FreeformBlocksPreview({ className = '' }: FreeformBlocksPreviewProps) {
  const prefersReducedMotion = useReducedMotionPreference()

  if (prefersReducedMotion) {
    return (
      <div className={`relative h-full w-full ${className}`}>
        {blocks.map(block => {
          const Icon = block.icon
          return (
            <div
              key={`${block.x}-${block.y}`}
              className="absolute flex items-center justify-center rounded-xl border border-accent/30 bg-accent/15"
              style={{
                left: `${block.x}%`,
                top: `${block.y}%`,
                width: block.size,
                height: block.size,
                transform: `translate(-50%, -50%) rotate(${block.rotate}deg)`
              }}
            >
              <Icon size={20} className="text-accent" aria-hidden />
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <LazyMotion features={domAnimation}>
      <div className={`relative h-full w-full ${className}`}>
        <svg className="absolute inset-0 h-full w-full opacity-25" aria-hidden>
          <m.line
            x1="18%"
            y1="25%"
            x2="60%"
            y2="20%"
            stroke="var(--accent)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
          />
          <m.line
            x1="30%"
            y1="65%"
            x2="72%"
            y2="60%"
            stroke="var(--accent)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: 0.7 }}
          />
          <m.line
            x1="18%"
            y1="25%"
            x2="30%"
            y2="65%"
            stroke="var(--accent-hover)"
            strokeWidth="1"
            strokeDasharray="3 3"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: 0.9 }}
          />
        </svg>

        {blocks.map((block, index) => {
          const Icon = block.icon
          return (
            <m.div
              key={`${block.x}-${block.y}`}
              className="absolute flex items-center justify-center rounded-xl border border-accent/30 bg-accent/15"
              style={{
                left: `${block.x}%`,
                top: `${block.y}%`,
                width: block.size,
                height: block.size,
                boxShadow: '0 4px 16px color-mix(in oklch, var(--accent) 15%, transparent)'
              }}
              initial={{
                x: '-50%',
                y: -40,
                opacity: 0,
                rotate: block.rotate * 2
              }}
              animate={{
                x: '-50%',
                y: '-50%',
                opacity: 1,
                rotate: [block.rotate, block.rotate + 2, block.rotate - 2, block.rotate]
              }}
              transition={{
                y: { duration: 0.6, delay: index * 0.15, ease: [0.34, 1.56, 0.64, 1] },
                opacity: { duration: 0.4, delay: index * 0.15 },
                rotate: {
                  duration: 4,
                  delay: index * 0.2 + 1,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }
              }}
            >
              <Icon size={20} className="text-accent" aria-hidden />
            </m.div>
          )
        })}
      </div>
    </LazyMotion>
  )
}
