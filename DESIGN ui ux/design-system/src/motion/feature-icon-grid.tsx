'use client'

import { domAnimation, LazyMotion, m } from 'framer-motion'
import { Code2, GitFork, GitPullRequest, Star, Users } from 'lucide-react'
import { GitHubBrandIcon } from '../brand-icons'

interface FeatureIconGridProps {
  className?: string
}

const icons = [
  { Icon: GitHubBrandIcon, delay: 0 },
  { Icon: Star, delay: 0.1 },
  { Icon: GitFork, delay: 0.2 },
  { Icon: GitPullRequest, delay: 0.3 },
  { Icon: Users, delay: 0.4 },
  { Icon: Code2, delay: 0.5 }
]

/**
 * Render an animated grid of community and tooling icons.
 * @param props - Component styling props.
 */
export function FeatureIconGrid({ className = '' }: FeatureIconGridProps) {
  return (
    <LazyMotion features={domAnimation}>
      <div className={`flex h-full items-center justify-center ${className}`}>
        <div className="grid grid-cols-3 gap-2">
          {icons.map(({ Icon, delay }) => (
            <m.div
              key={Icon.displayName || Icon.name}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{
                opacity: [0.5, 0.9, 0.5],
                scale: 1
              }}
              transition={{
                opacity: {
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: delay + 1
                },
                scale: {
                  duration: 0.3,
                  delay
                }
              }}
            >
              <Icon className="h-4 w-4 text-accent" />
            </m.div>
          ))}
        </div>
      </div>
    </LazyMotion>
  )
}
