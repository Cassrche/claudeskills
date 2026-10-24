'use client'

import { domAnimation, LazyMotion, m } from 'framer-motion'
import { GitFork, GitPullRequest, Heart, Star, Users } from 'lucide-react'
import { GitHubBrandIcon } from '../brand-icons'
import { useReducedMotionPreference } from './reduced-motion-preference'

interface CommunityOrbitProps {
  className?: string
  isHovered?: boolean
}

const nodes = [
  { icon: GitHubBrandIcon, angle: 0 },
  { icon: Star, angle: 72 },
  { icon: GitFork, angle: 144 },
  { icon: GitPullRequest, angle: 216 },
  { icon: Users, angle: 288 }
]

const ORBIT_RADIUS = 48

/**
 * Render orbiting community icons around a central heart.
 * @param props - Component styling props.
 */
export function CommunityOrbit({ className = '' }: CommunityOrbitProps) {
  const prefersReducedMotion = useReducedMotionPreference()

  /**
   * Calculate the x/y position for an orbiting node.
   * @param angle - Angle in degrees around the orbit.
   * @returns Cartesian position for the node.
   */
  const getPosition = (angle: number) => {
    const rad = (angle * Math.PI) / 180
    return {
      x: Math.cos(rad) * ORBIT_RADIUS,
      y: Math.sin(rad) * ORBIT_RADIUS
    }
  }

  if (prefersReducedMotion) {
    return (
      <div className={`relative flex h-full w-full items-center justify-center ${className}`}>
        <div className="absolute flex size-10 items-center justify-center rounded-full border-2 border-accent/40 bg-accent/20">
          <Heart size={18} className="text-accent" aria-hidden />
        </div>
        {nodes.map(node => {
          const pos = getPosition(node.angle)
          const Icon = node.icon
          return (
            <div
              key={node.angle}
              className="absolute flex size-8 items-center justify-center rounded-full border border-accent/30 bg-accent/15"
              style={{
                left: `calc(50% + ${pos.x}px)`,
                top: `calc(50% + ${pos.y}px)`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <Icon size={14} className="text-accent" aria-hidden />
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <LazyMotion features={domAnimation}>
      <div className={`relative flex h-full w-full items-center justify-center ${className}`}>
        <div className="absolute z-10 flex size-10 items-center justify-center rounded-full border-2 border-accent/40 bg-accent/20 shadow-[0_0_20px_color-mix(in_oklch,var(--accent)_30%,transparent)]">
          <Heart size={18} className="text-accent" aria-hidden />
        </div>

        {nodes.map((node, index) => {
          const Icon = node.icon
          return (
            <m.div
              key={node.angle}
              className="absolute flex size-8 items-center justify-center rounded-full border border-accent/35 bg-accent/15 shadow-[0_2px_10px_color-mix(in_oklch,var(--accent)_20%,transparent)]"
              style={{
                left: '50%',
                top: '50%',
                marginLeft: -16,
                marginTop: -16
              }}
              initial={{
                opacity: 0,
                scale: 0.95,
                x: getPosition(node.angle).x,
                y: getPosition(node.angle).y
              }}
              animate={{
                opacity: 1,
                scale: 1,
                x: [
                  getPosition(node.angle).x,
                  getPosition(node.angle + 72).x,
                  getPosition(node.angle + 144).x,
                  getPosition(node.angle + 216).x,
                  getPosition(node.angle + 288).x,
                  getPosition(node.angle + 360).x
                ],
                y: [
                  getPosition(node.angle).y,
                  getPosition(node.angle + 72).y,
                  getPosition(node.angle + 144).y,
                  getPosition(node.angle + 216).y,
                  getPosition(node.angle + 288).y,
                  getPosition(node.angle + 360).y
                ]
              }}
              transition={{
                opacity: { duration: 0.4, delay: index * 0.1 },
                scale: { duration: 0.4, delay: index * 0.1, ease: [0.34, 1.56, 0.64, 1] },
                x: { duration: 25, repeat: Infinity, ease: 'linear' },
                y: { duration: 25, repeat: Infinity, ease: 'linear' }
              }}
            >
              <Icon size={14} className="text-accent" aria-hidden />
            </m.div>
          )
        })}
      </div>
    </LazyMotion>
  )
}
