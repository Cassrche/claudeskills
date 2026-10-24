'use client'

import { cn } from '@repo/utils'

interface ProfileEditorHeaderProps {
  isProfilePublic: boolean
  isSavingProfile: boolean
  onSave: () => void
  onVisibilityChange: (value: boolean) => void
  saveMessage: 'saved' | 'error' | null
}

/**
 * Render the profile editor title, visibility selector, and save controls.
 */
export function ProfileEditorHeader({
  isProfilePublic,
  isSavingProfile,
  onSave,
  onVisibilityChange,
  saveMessage
}: ProfileEditorHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <h1 className="font-bold text-3xl text-foreground">Profile</h1>
      <div className="flex items-center gap-3">
        <label
          className="flex items-center gap-2 text-foreground-muted text-sm"
          htmlFor="profile-visibility"
        >
          <span>Visibility</span>
          <select
            id="profile-visibility"
            value={isProfilePublic ? 'public' : 'private'}
            onChange={event => onVisibilityChange(event.target.value === 'public')}
            className={cn(
              'rounded-md border border-border bg-background px-3 py-1.5 text-foreground text-sm',
              'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring'
            )}
          >
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
        </label>
        {saveMessage === 'saved' && <span className="text-accent text-sm">Saved</span>}
        {saveMessage === 'error' && <span className="text-destructive text-sm">Save failed</span>}
        <button
          type="button"
          onClick={onSave}
          disabled={isSavingProfile}
          className={cn(
            'rounded-md bg-accent px-4 py-2 font-medium text-accent-foreground text-sm',
            'hover:bg-accent-hover disabled:opacity-50'
          )}
        >
          {isSavingProfile ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
