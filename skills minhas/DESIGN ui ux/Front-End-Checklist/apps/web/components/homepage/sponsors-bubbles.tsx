'use client'

import type { Sponsor } from '@repo/types'
import { cn } from '@repo/utils'
import type { CSSProperties } from 'react'
import { useMemo } from 'react'
import { getSponsorBubbleSize, getSponsorTierColor } from '@/lib/sponsors'
import { SponsorAvatar } from './sponsor-avatar'

interface SponsorBubbleProps {
  sponsor: Sponsor
  size: number
  tierColor: string
  style?: CSSProperties
}

/**
 * SponsorBubble function.
 * @param { sponsor - { sponsor.
 * @param size - size.
 * @param tierColor - tierColor.
 * @param style } - style }.
 */
function SponsorBubble({ sponsor, size, tierColor, style }: SponsorBubbleProps) {
  const href = sponsor.websiteUrl || `https://github.com/${sponsor.login}`
  const displayName = sponsor.name || sponsor.login
  const hasTierBorder = tierColor !== 'transparent'
  const avatarStyle: CSSProperties & { '--tw-ring-color'?: string } = {
    width: size - 4,
    height: size - 4,
    '--tw-ring-color': hasTierBorder ? tierColor : undefined
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'group absolute flex items-center justify-center',
        'transition-all duration-300 ease-out',
        'hover:z-20 hover:scale-110',
        'rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2'
      )}
      title={`${displayName}${sponsor.totalDonations ? ` - $${String(sponsor.totalDonations)}` : ''}`}
      style={{
        width: size,
        height: size,
        ...style
      }}
    >
      {/* Tier glow effect for higher tiers */}
      {hasTierBorder && (
        <div
          className="absolute inset-0 rounded-full opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-60"
          style={{
            backgroundColor: tierColor,
            transform: 'scale(1.3)'
          }}
        />
      )}

      {/* Avatar */}
      <div
        className={cn(
          'relative overflow-hidden rounded-full bg-background-subtle',
          'transition-all duration-300',
          hasTierBorder && 'ring-2 ring-offset-1 ring-offset-background'
        )}
        style={avatarStyle}
      >
        <SponsorAvatar sponsor={sponsor} size={size - 4} />
      </div>
    </a>
  )
}

interface SponsorsBubblesProps {
  sponsors: Sponsor[]
  className?: string
}

/**
 * Calculate positions for sponsors in a circular pack layout
 * Larger sponsors in center, smaller ones on outer rings
 */
function calculateCirclePackPositions(
  sponsors: Array<{ sponsor: Sponsor; size: number; tierColor: string }>,
  containerSize: number
): Array<{ x: number; y: number; sponsor: Sponsor; size: number; tierColor: string }> {
  if (sponsors.length === 0) return []

  const centerX = containerSize / 2
  const centerY = containerSize / 2
  const positions: Array<{
    x: number
    y: number
    sponsor: Sponsor
    size: number
    tierColor: string
  }> = []

  // Sort by size (largest first)
  const sorted = [...sponsors].sort((a, b) => b.size - a.size)

  // Gap between bubbles
  const gap = 12

  // Place sponsors in concentric rings
  let currentRing = 0
  let angleOffset = 0
  let placedInRing = 0
  let ringCapacity = 1 // First ring is center (1 sponsor)
  let ringRadius = 0

  for (let i = 0; i < sorted.length; i++) {
    const { sponsor, size, tierColor } = sorted[i]

    if (currentRing === 0) {
      // Center position for largest sponsor
      positions.push({
        x: centerX - size / 2,
        y: centerY - size / 2,
        sponsor,
        size,
        tierColor
      })
      currentRing = 1
      // Ring radius = center bubble radius + gap + half of next bubble size
      const nextSize = sorted[1]?.size || size
      ringRadius = size / 2 + gap + nextSize / 2
      // Calculate capacity based on circumference and bubble sizes
      ringCapacity = Math.max(4, Math.floor((2 * Math.PI * ringRadius) / (nextSize + gap)))
      placedInRing = 0
      // Use golden angle offset for natural-looking distribution (deterministic)
      angleOffset = currentRing * 2.39996
    } else {
      // Calculate position on current ring
      const angle = angleOffset + (placedInRing / ringCapacity) * 2 * Math.PI
      const x = centerX + ringRadius * Math.cos(angle) - size / 2
      const y = centerY + ringRadius * Math.sin(angle) - size / 2

      positions.push({ x, y, sponsor, size, tierColor })
      placedInRing++

      // Move to next ring if current is full
      if (placedInRing >= ringCapacity && i < sorted.length - 1) {
        currentRing++
        // Calculate average size of items that will go in next ring
        const remainingItems = sorted.slice(i + 1)
        const nextRingItems = remainingItems.slice(0, Math.min(12, remainingItems.length))
        const avgSizeInNextRing =
          nextRingItems.reduce((sum, s) => sum + s.size, 0) / nextRingItems.length || 40

        // Current ring's max size for calculating next ring radius
        const currentRingMaxSize = Math.max(
          ...sorted.slice(i - placedInRing + 1, i + 1).map(s => s.size)
        )

        // Ring radius increases by current ring bubble radius + gap + next ring bubble radius
        ringRadius += currentRingMaxSize / 2 + gap + avgSizeInNextRing / 2
        ringCapacity = Math.max(
          6,
          Math.floor((2 * Math.PI * ringRadius) / (avgSizeInNextRing + gap))
        )
        placedInRing = 0
        // Use golden angle offset for natural-looking distribution (deterministic)
        angleOffset = currentRing * 2.39996
      }
    }
  }

  // Calculate actual bounds and normalize positions
  if (positions.length > 0) {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity
    for (const pos of positions) {
      minX = Math.min(minX, pos.x)
      minY = Math.min(minY, pos.y)
      maxX = Math.max(maxX, pos.x + pos.size)
      maxY = Math.max(maxY, pos.y + pos.size)
    }
    // Shift all positions to start from 0,0
    for (const pos of positions) {
      pos.x -= minX
      pos.y -= minY
    }
  }

  return positions
}

/**
 * SponsorsBubbles function.
 * @param { sponsors - { sponsors.
 * @param className } - className }.
 */
export function SponsorsBubbles({ sponsors, className }: SponsorsBubblesProps) {
  // Calculate sizes for all sponsors - larger sizes for better visibility
  const sponsorsWithSizes = useMemo(() => {
    return sponsors.map(sponsor => ({
      sponsor,
      size: getSponsorBubbleSize(sponsor.totalDonations || 0, 56, 120),
      tierColor: getSponsorTierColor(sponsor.tier)
    }))
  }, [sponsors])

  // Calculate positions and actual container dimensions
  const { positions, width, height } = useMemo(() => {
    // Use a large initial container for calculation, positions get normalized
    const initialSize = 800
    const positions = calculateCirclePackPositions(sponsorsWithSizes, initialSize)

    if (positions.length === 0) {
      return { positions: [], width: 0, height: 0 }
    }

    // Calculate actual bounds from normalized positions
    let maxX = 0,
      maxY = 0
    for (const pos of positions) {
      maxX = Math.max(maxX, pos.x + pos.size)
      maxY = Math.max(maxY, pos.y + pos.size)
    }

    return { positions, width: maxX, height: maxY }
  }, [sponsorsWithSizes])

  if (sponsors.length === 0) {
    return null
  }

  return (
    <div className={cn('flex w-full justify-center', className)}>
      <div
        className="relative"
        style={{
          width,
          height
        }}
      >
        {positions.map(({ x, y, sponsor, size, tierColor }) => (
          <SponsorBubble
            key={`${sponsor.source}-${sponsor.login}`}
            sponsor={sponsor}
            size={size}
            tierColor={tierColor}
            style={{
              left: x,
              top: y
            }}
          />
        ))}
      </div>
    </div>
  )
}
