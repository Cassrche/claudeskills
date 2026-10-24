'use client'

import { Checkbox } from '@repo/design-system/ui/checkbox'
import { Input } from '@repo/design-system/ui/input'

interface SocialLinksSectionProps {
  githubUrl: string
  xUrl: string
  linkedinUrl: string
  githubUsername?: string
  onGithubUrlChange: (value: string) => void
  onXUrlChange: (value: string) => void
  onLinkedinUrlChange: (value: string) => void
}

/** Render editable social-profile URL fields. */
export function SocialLinksSection({
  githubUrl,
  xUrl,
  linkedinUrl,
  githubUsername,
  onGithubUrlChange,
  onXUrlChange,
  onLinkedinUrlChange
}: SocialLinksSectionProps) {
  return (
    <section>
      <h2 className="mb-3 font-semibold text-foreground text-sm">Social links</h2>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-foreground-muted text-xs" htmlFor="profile-github">
            GitHub username
          </label>
          <Input
            id="profile-github"
            value={githubUrl}
            onChange={e => onGithubUrlChange(e.target.value)}
            placeholder="username"
            type="text"
            readOnly={Boolean(githubUsername)}
            className={githubUsername ? 'cursor-default opacity-70' : ''}
          />
          {githubUsername && (
            <p className="mt-1 text-foreground-muted text-xs">From your GitHub sign-in</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-foreground-muted text-xs" htmlFor="profile-x">
            X handle
          </label>
          <Input
            id="profile-x"
            value={xUrl}
            onChange={e => onXUrlChange(e.target.value)}
            placeholder="@username"
            type="text"
          />
        </div>
        <div>
          <label className="mb-1 block text-foreground-muted text-xs" htmlFor="profile-linkedin">
            LinkedIn profile
          </label>
          <Input
            id="profile-linkedin"
            value={linkedinUrl}
            onChange={e => onLinkedinUrlChange(e.target.value)}
            placeholder="username"
            type="text"
          />
          <p className="mt-1 text-foreground-muted text-xs">
            Use your profile slug, or paste the full LinkedIn URL.
          </p>
        </div>
      </div>
    </section>
  )
}

interface VisibilitySectionProps {
  showProgress: boolean
  showChecklists: boolean
  onShowProgressChange: (checked: boolean) => void
  onShowChecklistsChange: (checked: boolean) => void
}

/** Render profile visibility toggles for public sections. */
export function VisibilitySection({
  showProgress,
  showChecklists,
  onShowProgressChange,
  onShowChecklistsChange
}: VisibilitySectionProps) {
  return (
    <section>
      <h2 className="mb-3 font-semibold text-foreground text-sm">
        What to show on your public profile
      </h2>
      <div className="flex flex-col gap-3">
        <label className="flex cursor-pointer items-center gap-2" htmlFor="profile-show-progress">
          <Checkbox
            id="profile-show-progress"
            checked={showProgress}
            onCheckedChange={v => onShowProgressChange(v === true)}
          />
          <span className="text-foreground text-sm">Show completion progress</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2" htmlFor="profile-show-checklists">
          <Checkbox
            id="profile-show-checklists"
            checked={showChecklists}
            onCheckedChange={v => onShowChecklistsChange(v === true)}
          />
          <span className="text-foreground text-sm">Show shared checklists</span>
        </label>
      </div>
    </section>
  )
}
