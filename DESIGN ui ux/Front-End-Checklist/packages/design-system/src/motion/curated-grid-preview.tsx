'use client'

import { domAnimation, LazyMotion, m } from 'framer-motion'
import { FileCheck, Lock, Search, Shield, Smartphone, Zap } from 'lucide-react'
import { useReducedMotionPreference } from './reduced-motion-preference'

interface CuratedGridPreviewProps {
  className?: string
  isHovered?: boolean
}

const items = [
  { icon: FileCheck, label: 'SEO' },
  { icon: Shield, label: 'A11y' },
  { icon: Zap, label: 'Perf' },
  { icon: Search, label: 'Meta' },
  { icon: Smartphone, label: 'PWA' },
  { icon: Lock, label: 'Sec' }
]

/**
 * Render an animated grid preview for curated checklist categories.
 * @param props - Component styling props.
 */
export function CuratedGridPreview({ className = '' }: CuratedGridPreviewProps) {
  const prefersReducedMotion = useReducedMotionPreference()

  if (prefersReducedMotion) {
    return (
      <div className={`relative h-full w-full overflow-hidden ${className}`}>
        <div className="absolute inset-0 rounded-xl bg-linear-to-br from-accent/10 via-accent/5 to-accent/10" />
        <div className="relative flex h-full w-full items-center justify-center">
          <div className="grid grid-cols-3 gap-2">
            {items.map(item => {
              const Icon = item.icon
              return (
                <div
                  key={item.label}
                  className="flex h-11 w-[52px] flex-col items-center justify-center rounded-lg border border-foreground/10 bg-foreground/5"
                >
                  <Icon size={16} className="shrink-0 text-accent" aria-hidden />
                  <span className="mt-0.5 text-[9px] text-foreground-muted">{item.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <LazyMotion features={domAnimation}>
      <div className={`relative h-full w-full overflow-hidden ${className}`}>
        <m.div
          className="absolute inset-0 rounded-xl bg-linear-to-br from-accent/15 via-accent/10 to-accent/8"
          animate={{
            opacity: [0.5, 0.8, 0.5]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />

        <div className="relative flex h-full w-full items-center justify-center">
          <div className="grid grid-cols-3 gap-2">
            {items.map((item, index) => {
              const Icon = item.icon
              return (
                <m.div
                  key={item.label}
                  className="flex h-11 w-[52px] flex-col items-center justify-center rounded-lg border border-foreground/10 bg-foreground/5"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{
                    opacity: 1,
                    scale: [1, 1.03, 1]
                  }}
                  transition={{
                    opacity: { duration: 0.3, delay: index * 0.08 },
                    scale: {
                      duration: 2.5,
                      delay: index * 0.15,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }
                  }}
                >
                  <Icon size={16} className="shrink-0 text-accent" aria-hidden />
                  <span className="mt-0.5 text-[9px] text-foreground-muted">{item.label}</span>
                </m.div>
              )
            })}
          </div>
        </div>
      </div>
    </LazyMotion>
  )
}
