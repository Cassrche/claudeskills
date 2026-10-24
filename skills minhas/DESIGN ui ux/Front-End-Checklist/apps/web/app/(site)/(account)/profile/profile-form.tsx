'use client'

import { Input } from '@repo/design-system/ui/input'
import { cn } from '@repo/utils'
import { useQueryClient } from '@tanstack/react-query'
import { useAction } from 'next-safe-action/hooks'
import { useReducer, useState } from 'react'
import { updateProfileAction } from '@/actions/profile-actions'
import { getSafeActionErrorMessage } from '@/lib/safe-action-result'
import { getSocialProfileInputValue } from '@/lib/social-links'
import { ProfileAccountCard } from './profile-account-card'
import { ProfileEditorHeader } from './profile-editor-header'
import { GithubMetadataSection } from './profile-github-metadata-section'
import { SocialLinksSection, VisibilitySection } from './profile-sections'
import { getSyncedProfile } from './profile-sync-response'
import type { ProfileData, ProfileUser } from './profile-types'
import { ProfileUrlSection } from './profile-url-section'

interface ProfileFormState {
  headline: string
  bio: string
  githubUrl: string
  xUrl: string
  linkedinUrl: string
  isProfilePublic: boolean
  showProgress: boolean
  showChecklists: boolean
}

type TextField = 'headline' | 'bio' | 'githubUrl' | 'xUrl' | 'linkedinUrl'
type BooleanField = 'isProfilePublic' | 'showProgress' | 'showChecklists'

type ProfileFormAction =
  | { type: 'replace'; state: ProfileFormState }
  | { type: 'setText'; field: TextField; value: string }
  | { type: 'setBoolean'; field: BooleanField; value: boolean }
type CurrentProfileAction = { type: 'replace'; profile: ProfileData }

interface ProfileFormProps {
  profile: ProfileData
  user: ProfileUser
}

/**
 * Convert a loaded profile into editable form state.
 *
 * @param profile - Profile record returned by the profile API or action.
 * @returns Editable profile form values.
 */
function createProfileFormState(profile: ProfileData): ProfileFormState {
  return {
    headline: profile.headline ?? '',
    bio: profile.bio ?? '',
    githubUrl: getSocialProfileInputValue('github', profile.githubUrl),
    xUrl: getSocialProfileInputValue('x', profile.xUrl),
    linkedinUrl: getSocialProfileInputValue('linkedin', profile.linkedinUrl),
    isProfilePublic: profile.isProfilePublic,
    showProgress: profile.showProgress,
    showChecklists: profile.showChecklists
  }
}

/**
 * Apply a single edit action to profile form state.
 *
 * @param state - Current editable profile form values.
 * @param action - Form edit action to apply.
 * @returns Updated form state.
 */
function profileFormReducer(state: ProfileFormState, action: ProfileFormAction): ProfileFormState {
  if (action.type === 'replace') {
    return action.state
  }

  return { ...state, [action.field]: action.value }
}

/**
 * Replace the current profile snapshot after a server update.
 *
 * @param _state - Existing profile snapshot.
 * @param action - Profile replacement action.
 * @returns Updated profile snapshot.
 */
function currentProfileReducer(_state: ProfileData, action: CurrentProfileAction): ProfileData {
  return action.profile
}

/**
 * Render the editable profile form once profile data has loaded.
 */
export function ProfileForm({ profile, user }: ProfileFormProps) {
  const queryClient = useQueryClient()
  const [currentProfile, replaceCurrentProfile] = useReducer(currentProfileReducer, profile)
  const [form, dispatch] = useReducer(profileFormReducer, profile, createProfileFormState)
  const [saveMessage, setSaveMessage] = useState<'saved' | 'error' | null>(null)
  const [syncMessage, setSyncMessage] = useState<'synced' | 'error' | null>(null)
  const [isSyncingGithub, setIsSyncingGithub] = useState(false)
  const { executeAsync: executeUpdateProfile, isPending: isSavingProfile } =
    useAction(updateProfileAction)

  /**
   * Persist the current form values through the profile action.
   */
  const handleSave = () => {
    void (async () => {
      setSaveMessage(null)

      const payload: Partial<ProfileData> = {
        headline: form.headline.trim() || undefined,
        bio: form.bio.trim() || undefined,
        xUrl: form.xUrl.trim() || undefined,
        linkedinUrl: form.linkedinUrl.trim() || undefined,
        isProfilePublic: form.isProfilePublic,
        showProgress: form.showProgress,
        showChecklists: form.showChecklists
      }

      if (!currentProfile.githubUsername) {
        payload.githubUrl = form.githubUrl.trim() || undefined
      }

      const result = await executeUpdateProfile(payload)
      if (!result.data) {
        setSaveMessage('error')
        throw new Error(getSafeActionErrorMessage(result, 'Failed to save'))
      }

      dispatch({ type: 'replace', state: createProfileFormState(result.data) })
      replaceCurrentProfile({ type: 'replace', profile: result.data })
      await queryClient.invalidateQueries({ queryKey: ['profile'] })
      setSaveMessage('saved')
      setTimeout(() => setSaveMessage(null), 3000)
    })().catch(() => {
      setSaveMessage('error')
    })
  }

  /**
   * Refresh read-only GitHub profile metadata from the linked account.
   */
  const handleGithubSync = () => {
    void (async () => {
      setSyncMessage(null)
      setIsSyncingGithub(true)

      const response = await fetch('/api/profile/github-sync', { method: 'POST' })
      const result: unknown = await response.json()
      const nextProfile = getSyncedProfile(result)

      if (!response.ok || !nextProfile) {
        setSyncMessage('error')
        return
      }

      replaceCurrentProfile({ type: 'replace', profile: nextProfile })
      dispatch({ type: 'replace', state: createProfileFormState(nextProfile) })
      await queryClient.invalidateQueries({ queryKey: ['profile'] })
      setSyncMessage('synced')
      setTimeout(() => setSyncMessage(null), 3000)
    })()
      .catch(() => {
        setSyncMessage('error')
      })
      .finally(() => {
        setIsSyncingGithub(false)
      })
  }

  const resolvedUsername = currentProfile.username ?? currentProfile.githubUsername

  return (
    <>
      <ProfileEditorHeader
        isProfilePublic={form.isProfilePublic}
        isSavingProfile={isSavingProfile}
        onSave={handleSave}
        onVisibilityChange={value =>
          dispatch({ type: 'setBoolean', field: 'isProfilePublic', value })
        }
        saveMessage={saveMessage}
      />

      <div className="mt-8 space-y-8">
        <ProfileAccountCard
          isSyncingGithub={isSyncingGithub}
          onGithubSync={handleGithubSync}
          profile={currentProfile}
          syncMessage={syncMessage}
          user={user}
        />

        <GithubMetadataSection
          company={currentProfile.githubCompany}
          blog={currentProfile.githubBlog}
          location={currentProfile.githubLocation}
          publicRepos={currentProfile.githubPublicRepos}
          followers={currentProfile.githubFollowers}
        />

        <ProfileUrlSection
          resolvedUsername={resolvedUsername}
          isProfilePublic={form.isProfilePublic}
        />

        <section>
          <label
            className="mb-2 block font-medium text-foreground text-sm"
            htmlFor="profile-headline"
          >
            Headline
          </label>
          <Input
            id="profile-headline"
            value={form.headline}
            onChange={event =>
              dispatch({ type: 'setText', field: 'headline', value: event.target.value })
            }
            placeholder="e.g. Full Stack Developer"
            maxLength={100}
          />
        </section>

        <section>
          <label className="mb-2 block font-medium text-foreground text-sm" htmlFor="profile-bio">
            Bio
          </label>
          <textarea
            id="profile-bio"
            value={form.bio}
            onChange={event =>
              dispatch({ type: 'setText', field: 'bio', value: event.target.value })
            }
            placeholder="A short bio (optional)"
            maxLength={160}
            rows={3}
            className={cn(
              'flex w-full rounded-md border border-input-border bg-input px-3 py-2 text-foreground text-sm',
              'placeholder:text-foreground-subtle',
              'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          />
          <p className="mt-1 text-foreground-muted text-xs">{form.bio.length}/160</p>
        </section>

        <SocialLinksSection
          githubUrl={form.githubUrl}
          xUrl={form.xUrl}
          linkedinUrl={form.linkedinUrl}
          githubUsername={currentProfile.githubUsername}
          onGithubUrlChange={value => dispatch({ type: 'setText', field: 'githubUrl', value })}
          onXUrlChange={value => dispatch({ type: 'setText', field: 'xUrl', value })}
          onLinkedinUrlChange={value => dispatch({ type: 'setText', field: 'linkedinUrl', value })}
        />

        <VisibilitySection
          showProgress={form.showProgress}
          showChecklists={form.showChecklists}
          onShowProgressChange={value =>
            dispatch({ type: 'setBoolean', field: 'showProgress', value })
          }
          onShowChecklistsChange={value =>
            dispatch({ type: 'setBoolean', field: 'showChecklists', value })
          }
        />
      </div>
    </>
  )
}
