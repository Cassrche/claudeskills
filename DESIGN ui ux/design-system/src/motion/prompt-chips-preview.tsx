'use client'

import { domAnimation, LazyMotion, m } from 'framer-motion'
import { HelpCircle, Sparkles, Wrench } from 'lucide-react'
import { useReducedMotionPreference } from './reduced-motion-preference'

interface PromptChipsPreviewProps {
  className?: string
  isHovered?: boolean
}

const prompts = [
  { text: 'Check accessibility', icon: Sparkles, x: 15, y: 20 },
  { text: 'Fix this issue', icon: Wrench, x: 55, y: 45 },
  { text: 'Explain why', icon: HelpCircle, x: 25, y: 70 }
]

const sparkleParticles = [
  { id: 'sparkle-1', left: 20, top: 30, duration: 2, delay: 0 },
  { id: 'sparkle-2', left: 32, top: 50, duration: 2.3, delay: 0.2 },
  { id: 'sparkle-3', left: 44, top: 70, duration: 2.6, delay: 0.4 },
  { id: 'sparkle-4', left: 56, top: 30, duration: 2.9, delay: 0.6 },
  { id: 'sparkle-5', left: 68, top: 50, duration: 3.2, delay: 0.8 },
  { id: 'sparkle-6', left: 80, top: 70, duration: 3.5, delay: 1 }
]

/**
 * Render animated prompt chips that preview AI actions.
 * @param props - Component styling props.
 */
export function PromptChipsPreview({ className = '' }: PromptChipsPreviewProps) {
  const prefersReducedMotion = useReducedMotionPreference()

  if (prefersReducedMotion) {
    return (
      <div className={`relative h-full w-full ${className}`}>
        {prompts.map(prompt => {
          const Icon = prompt.icon
          return (
            <div
              key={prompt.text}
              className="absolute flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/15 px-3 py-2 font-medium text-foreground text-sm"
              style={{
                left: `${prompt.x}%`,
                top: `${prompt.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <Icon size={14} className="shrink-0 text-accent" aria-hidden />
              {prompt.text}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <LazyMotion features={domAnimation}>
      <div className={`relative h-full w-full ${className}`}>
        <div
          className="absolute inset-0 rounded-xl opacity-30"
          style={{
            background:
              'radial-gradient(ellipse at 60% 50%, color-mix(in oklch, var(--accent) 20%, transparent) 0%, transparent 60%)'
          }}
        />

        {prompts.map((prompt, index) => {
          const Icon = prompt.icon
          return (
            <m.div
              key={prompt.text}
              className="absolute flex items-center gap-2 rounded-lg border border-accent/25 bg-accent/10 px-3 py-2 font-medium text-foreground text-sm shadow-sm backdrop-blur-sm"
              style={{
                left: `${prompt.x}%`,
                top: `${prompt.y}%`
              }}
              initial={{ opacity: 0, y: 20, x: '-50%' }}
              animate={{
                opacity: 1,
                y: ['-50%', 'calc(-50% - 4px)', '-50%'],
                x: '-50%'
              }}
              transition={{
                opacity: { duration: 0.5, delay: index * 0.2 },
                y: {
                  duration: 3 + index * 0.5,
                  delay: index * 0.3,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }
              }}
            >
              <Icon size={14} className="shrink-0 text-accent" aria-hidden />
              {prompt.text}
            </m.div>
          )
        })}

        {sparkleParticles.map(particle => (
          <m.div
            key={particle.id}
            className="absolute h-1 w-1 rounded-full bg-accent"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`
            }}
            animate={{
              opacity: [0.2, 0.6, 0.2],
              scale: [1, 1.5, 1]
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        ))}
      </div>
    </LazyMotion>
  )
}
