'use client'

import { domAnimation, LazyMotion, m } from 'framer-motion'
import { useMemo } from 'react'

interface Particle {
  id: number
  x: number
  y: number
  size: number
  duration: number
  delay: number
}

interface ParticleFieldProps {
  className?: string
  particleCount?: number
}

/**
 * Returns a stable pseudo-random value so SSR and hydration render identical particles.
 */
function seededParticleValue(index: number, salt: number): number {
  const value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43_758.5453
  return value - Math.floor(value)
}

/**
 * Render a subtle animated particle field behind hero content.
 * @param props - Particle density and styling props.
 */
export function ParticleField({ className = '', particleCount = 20 }: ParticleFieldProps) {
  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        x: seededParticleValue(i, 1) * 100,
        y: seededParticleValue(i, 2) * 100,
        size: seededParticleValue(i, 3) * 4 + 2,
        duration: 3 + seededParticleValue(i, 4) * 4,
        delay: seededParticleValue(i, 5) * 2
      })),
    [particleCount]
  )

  return (
    <LazyMotion features={domAnimation}>
      <div className={`relative h-full w-full overflow-hidden ${className}`}>
        {particles.map(particle => (
          <m.div
            key={particle.id}
            className="absolute rounded-full"
            style={{
              width: particle.size,
              height: particle.size,
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              backgroundColor: 'var(--accent)',
              opacity: 0.4
            }}
            animate={{
              y: [0, -15, 0],
              x: [0, particle.id % 2 === 0 ? 10 : -10, 0],
              opacity: [0.2, 0.6, 0.2],
              scale: [1, 1.2, 1]
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: particle.delay
            }}
          />
        ))}

        <div
          className="absolute top-1/2 left-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)',
            opacity: 0.15
          }}
        />
      </div>
    </LazyMotion>
  )
}
