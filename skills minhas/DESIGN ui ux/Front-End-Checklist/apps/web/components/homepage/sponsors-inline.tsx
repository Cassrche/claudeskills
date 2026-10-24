'use client'

import type { Sponsor } from '@repo/types'
import { cn } from '@repo/utils'
import Image from 'next/image'
import type { CSSProperties } from 'react'
import { useState } from 'react'
import { getSponsorBubbleSize, getSponsorTierColor } from '@/lib/sponsors'

interface SponsorsInlineProps {
  sponsors: Sponsor[]
  className?: string
}

/**
 * Render sponsors as a compact inline avatar row.
 *
 * @param props - Sponsors and layout options.
 */
export function SponsorsInline({ sponsors, className }: SponsorsInlineProps) {
  const sponsorsWithSizes = sponsors.map(sponsor => ({
    sponsor,
    size: getSponsorBubbleSize(sponsor.totalDonations || 0, 40, 72),
    tierColor: getSponsorTierColor(sponsor.tier)
  }))

  if (sponsors.length === 0) {
    return null
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {sponsorsWithSizes.map(({ sponsor, size, tierColor }) => {
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
              key={`${sponsor.source}-${sponsor.login}`}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'group relative flex items-center justify-center',
                'transition-all duration-300 ease-out',
                'hover:z-10 hover:scale-110',
                'rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'
              )}
              title={displayName}
              style={{ width: size, height: size }}
            >
              {hasTierBorder && (
                <div
                  className="absolute inset-0 rounded-full opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-50"
                  style={{ backgroundColor: tierColor, transform: 'scale(1.2)' }}
                />
              )}
              <div
                className={cn(
                  'relative overflow-hidden rounded-full bg-background-subtle',
                  hasTierBorder && 'ring-2 ring-offset-1 ring-offset-background'
                )}
                style={avatarStyle}
              >
                <InlineSponsorAvatar sponsor={sponsor} size={size} />
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}

interface InlineSponsorAvatarProps {
  sponsor: Sponsor
  size: number
}

/**
 * Render an inline sponsor avatar while tolerating broken upstream image URLs.
 *
 * @param props - Sponsor avatar props.
 * @returns Remote avatar image or a deterministic initials fallback.
 */
function InlineSponsorAvatar({ sponsor, size }: InlineSponsorAvatarProps) {
  const [hasError, setHasError] = useState(false)
  const displayName = sponsor.name || sponsor.login

  if (hasError || !sponsor.avatarUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-full bg-background-subtle font-semibold text-foreground">
        {displayName.slice(0, 2).toUpperCase()}
      </div>
    )
  }

  return (
    <Image
      src={sponsor.avatarUrl}
      alt={displayName}
      fill
      unoptimized
      className="object-cover"
      sizes={`${size}px`}
      onError={() => setHasError(true)}
    />
  )
}
