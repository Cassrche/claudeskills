'use client'

import { domAnimation, LazyMotion, m } from 'framer-motion'
import { Palette, Settings, Sliders, ToggleLeft } from 'lucide-react'

interface IconOrbitProps {
  className?: string
}

const icons = [
  { Icon: Settings, angle: 0 },
  { Icon: Sliders, angle: 90 },
  { Icon: ToggleLeft, angle: 180 },
  { Icon: Palette, angle: 270 }
]

/**
 * Render orbiting UI icons around a shared center point.
 * @param props - Component styling props.
 */
export function IconOrbit({ className = '' }: IconOrbitProps) {
  return (
    <LazyMotion features={domAnimation}>
      <div className={`relative flex h-full w-full items-center justify-center ${className}`}>
        <div className="absolute h-3 w-3 rounded-full bg-accent/40" />
        <div className="absolute h-20 w-20 rounded-full border border-accent/20 border-dashed" />
        <m.div
          className="absolute h-20 w-20"
          animate={{ rotate: 360 }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear'
          }}
        >
          {icons.map(({ Icon, angle }) => {
            const rad = (angle * Math.PI) / 180
            const x = Math.cos(rad) * 40
            const y = Math.sin(rad) * 40

            return (
              <m.div
                key={angle}
                className="absolute flex h-7 w-7 items-center justify-center rounded-md bg-accent/10"
                style={{
                  left: '50%',
                  top: '50%',
                  marginLeft: -14 + x,
                  marginTop: -14 + y
                }}
                animate={{ rotate: -360 }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: 'linear'
                }}
              >
                <Icon className="h-3.5 w-3.5 text-accent/70" />
              </m.div>
            )
          })}
        </m.div>
      </div>
    </LazyMotion>
  )
}
