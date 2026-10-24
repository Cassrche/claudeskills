'use client'

import { authClient } from '@repo/auth/auth-client'
import { useQuery } from '@tanstack/react-query'
import { ProfileForm } from './profile-form'
import type { ProfileData } from './profile-types'

const EMPTY_PROFILE: ProfileData = {
  isProfilePublic: true,
  showProgress: true,
  showChecklists: true
}

/**
 * Load the current signed-in user's editable profile record.
 *
 * @returns Profile data returned by the profile API.
 */
async function fetchProfile(): Promise<ProfileData> {
  const res = await fetch('/api/profile')
  if (!res.ok) throw new Error('Failed to load profile')
  const data = await res.json()
  return {
    username: data.username,
    githubUsername: data.githubUsername,
    headline: data.headline,
    bio: data.bio,
    githubUrl: data.githubUrl,
    xUrl: data.xUrl,
    linkedinUrl: data.linkedinUrl,
    githubCompany: data.githubCompany,
    githubBlog: data.githubBlog,
    githubLocation: data.githubLocation,
    githubPublicRepos: data.githubPublicRepos,
    githubFollowers: data.githubFollowers,
    githubProfileImportedAt: data.githubProfileImportedAt,
    isProfilePublic: data.isProfilePublic ?? true,
    showProgress: data.showProgress ?? true,
    showChecklists: data.showChecklists ?? true
  }
}

/**
 * Profile page shell with session and profile loading states.
 */
export function ProfilePageClient() {
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const isSignedIn = Boolean(session?.user?.id)

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    enabled: isSignedIn
  })

  if (isSessionPending || (isSignedIn && profileLoading)) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 rounded bg-background-muted" />
        <div className="h-32 rounded-lg bg-background-muted" />
        <div className="h-32 rounded-lg bg-background-muted" />
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center sm:p-12">
        <p className="text-foreground-muted text-lg">Sign in to edit your profile.</p>
      </div>
    )
  }

  return <ProfileForm profile={profile ?? EMPTY_PROFILE} user={session!.user} />
}
