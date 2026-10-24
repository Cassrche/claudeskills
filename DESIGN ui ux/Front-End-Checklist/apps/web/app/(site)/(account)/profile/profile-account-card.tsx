'use client'

import { RefreshCw } from '@repo/design-system/icons'
import { cn } from '@repo/utils'
import Image from 'next/image'
import type { ProfileData, ProfileUser } from './profile-types'

interface ProfileAccountCardProps {
  isSyncingGithub: boolean
  onGithubSync: () => void
  profile: ProfileData
  syncMessage: 'synced' | 'error' | null
  user: ProfileUser
}

/**
 * Render the account identity block and GitHub sync controls.
 */
export function ProfileAccountCard({
  isSyncingGithub,
  onGithubSync,
  profile,
  syncMessage,
  user
}: ProfileAccountCardProps) {
  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center gap-4">
        {user.image ? (
          <Image src={user.image} alt="" width={64} height={64} className="rounded-full" />
        ) : (
          <span className="flex size-16 items-center justify-center rounded-full bg-background-muted font-semibold text-foreground-muted text-xl">
            {(user.name ?? user.email ?? '?')[0]?.toUpperCase()}
          </span>
        )}
        <div>
          <p className="font-medium text-foreground">{user.name ?? 'Anonymous'}</p>
          <p className="text-foreground-muted text-sm">{user.email}</p>
          <p className="mt-1 text-foreground-muted text-xs">Managed via GitHub</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onGithubSync}
              disabled={isSyncingGithub}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 font-medium text-foreground text-xs',
                'hover:bg-background-muted disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              <RefreshCw
                aria-hidden="true"
                className={cn('size-3.5', isSyncingGithub && 'animate-spin')}
              />
              {isSyncingGithub ? 'Syncing...' : 'Sync GitHub'}
            </button>
            {profile.githubProfileImportedAt && (
              <span className="text-foreground-muted text-xs">Imported from GitHub</span>
            )}
            {syncMessage === 'synced' && <span className="text-accent text-xs">Synced</span>}
            {syncMessage === 'error' && (
              <span className="text-destructive text-xs">Sync failed</span>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
