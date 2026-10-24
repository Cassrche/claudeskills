'use client'

import { routePublicProfile, SITE_URL } from '@repo/config'
import Link from 'next/link'

interface ProfileUrlSectionProps {
  resolvedUsername?: string
  isProfilePublic: boolean
}

/** Render the generated public profile URL. */
export function ProfileUrlSection({ resolvedUsername, isProfilePublic }: ProfileUrlSectionProps) {
  const publicProfilePath = resolvedUsername ? routePublicProfile(resolvedUsername) : null
  const publicProfileUrl = publicProfilePath ? `${SITE_URL}${publicProfilePath}` : null
  const canOpenPublicProfile = Boolean(publicProfilePath && publicProfileUrl && isProfilePublic)

  return (
    <section>
      <p className="mb-2 font-medium text-foreground text-sm">Profile URL</p>
      {canOpenPublicProfile && publicProfilePath && publicProfileUrl ? (
        <Link
          href={publicProfilePath}
          target="_blank"
          rel="noopener noreferrer"
          className="block break-all text-accent text-sm underline hover:no-underline"
        >
          {publicProfileUrl}
        </Link>
      ) : (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-foreground-muted text-sm">
            {SITE_URL.replace(/^https?:\/\//, '')}
            {routePublicProfile('')}
          </span>
          {resolvedUsername ? (
            <span className="font-medium text-foreground text-sm">{resolvedUsername}</span>
          ) : (
            <span className="text-foreground-muted text-sm italic">not set</span>
          )}
        </div>
      )}
      <p className="mt-1 text-foreground-muted text-xs">
        {isProfilePublic
          ? 'Your profile URL is set from your GitHub username.'
          : 'Make your profile public to enable this URL.'}
      </p>
    </section>
  )
}
