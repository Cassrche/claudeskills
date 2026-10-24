'use client'

import { domAnimation, LazyMotion, m } from 'framer-motion'

interface MarqueeProps {
  items: string[]
  className?: string
  speed?: number
}

/**
 * Render a looping marquee for short checklist labels.
 * @param props - Marquee items and animation settings.
 */
export function Marquee({ items, className = '', speed = 25 }: MarqueeProps) {
  // Triple items for seamless loop
  const duplicatedItems = Array.from({ length: 3 }, (_, repeat) =>
    items.map((item, itemIndex) => ({
      id: `${repeat}-${itemIndex}`,
      text: item
    }))
  ).flat()

  return (
    <LazyMotion features={domAnimation}>
      <div className={`relative flex h-full items-center overflow-hidden ${className}`}>
        <m.div
          className="flex gap-2 whitespace-nowrap"
          animate={{
            x: ['0%', '-33.33%']
          }}
          transition={{
            x: {
              duration: speed,
              repeat: Infinity,
              ease: 'linear'
            }
          }}
        >
          {duplicatedItems.map(item => (
            <span
              key={item.id}
              className="inline-flex shrink-0 items-center rounded-md px-3 py-1.5 font-medium text-xs"
              style={{
                backgroundColor: 'var(--accent)',
                opacity: 0.15,
                color: 'var(--foreground)'
              }}
            >
              {item.text}
            </span>
          ))}
        </m.div>
      </div>
    </LazyMotion>
  )
}
