'use client'

import type { Sponsor } from '@repo/types'
import { cn } from '@repo/utils'
import Image from 'next/image'
import { useState } from 'react'

/**
 * Generate initials for the sponsor avatar fallback state.
 * @param name - Optional sponsor display name.
 * @param login - Sponsor login used as fallback text.
 */
function getInitials(name: string | null, login: string): string {
  const displayName = name || login
  const parts = displayName.split(/[\s-_]+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return displayName.slice(0, 2).toUpperCase()
}

/**
 * Pick a deterministic fallback background color from the sponsor login.
 * @param login - Sponsor login used for hashing.
 */
function getAvatarColor(login: string): string {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-cyan-500',
    'bg-rose-500',
    'bg-violet-500'
  ]
  const hash = login.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

interface SponsorAvatarProps {
  sponsor: Sponsor
  size: number
  className?: string
}

/**
 * Render a sponsor avatar with an initials fallback when the remote image fails.
 *
 * @param props - Avatar rendering props.
 */
export function SponsorAvatar({ sponsor, size, className }: SponsorAvatarProps) {
  const [hasError, setHasError] = useState(false)
  const displayName = sponsor.name || sponsor.login
  const initials = getInitials(sponsor.name, sponsor.login)
  const bgColor = getAvatarColor(sponsor.login)

  if (hasError || !sponsor.avatarUrl) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full font-semibold text-white',
          bgColor,
          className
        )}
        style={{ width: size, height: size, fontSize: size * 0.35 }}
      >
        {initials}
      </div>
    )
  }

  return (
    <Image
      src={sponsor.avatarUrl}
      alt={displayName}
      fill
      unoptimized
      className={cn('object-cover', className)}
      sizes={`${size}px`}
      onError={() => setHasError(true)}
    />
  )
}
