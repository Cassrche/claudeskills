'use client'

import { authClient } from '@repo/auth/auth-client'
import { Loader2, LogIn, ThumbsDown, ThumbsUp } from '@repo/design-system/icons'
import { cn } from '@repo/utils'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { useRuleFeedback } from '@/hooks/use-rule-feedback'
import { startGitHubSignIn } from '@/lib/auth-actions'

interface RuleFeedbackCardProps {
  ruleId: string
}

interface FeedbackButtonProps {
  active: boolean
  disabled: boolean
  icon: ReactNode
  label: string
  onClick: () => void
}

/**
 * Toggle button for helpful / not helpful feedback.
 */
function FeedbackButton({ active, disabled, icon, label, onClick }: FeedbackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-2 rounded-md border px-4 py-2 font-medium text-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60',
        active
          ? 'border-accent bg-accent/10 text-accent'
          : 'border-border bg-background hover:border-accent/40 hover:bg-accent/5'
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

/** Card showing “Was this rule helpful?” and sign-in or feedback buttons. */
export function RuleFeedbackCard({ ruleId }: RuleFeedbackCardProps) {
  const pathname = usePathname()
  const nextPath = useMemo(() => pathname || '/', [pathname])
  const [signInError, setSignInError] = useState<string | null>(null)
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const { currentUserFeedback, isLoading, isSaving, setFeedback } = useRuleFeedback(ruleId)

  const isBusy = sessionPending || isLoading

  return (
    <section
      aria-labelledby="rule-feedback-heading"
      className="mt-12 mb-8 rounded-xl border border-border bg-background-subtle px-5 py-4"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 id="rule-feedback-heading" className="font-semibold text-base text-foreground">
            Was this rule helpful?
          </h2>
          <p className="mt-1 text-foreground-muted text-sm leading-6">
            Your feedback helps improve rule quality. This stays internal for now.
          </p>
        </div>

        {isBusy ? (
          <div className="inline-flex items-center gap-2 text-foreground-muted text-sm">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Loading feedback...</span>
          </div>
        ) : session?.user ? (
          <div className="flex flex-wrap items-center gap-3">
            <FeedbackButton
              active={currentUserFeedback === 'helpful'}
              disabled={isSaving}
              icon={<ThumbsUp className="h-4 w-4" aria-hidden="true" />}
              label={isSaving && currentUserFeedback !== 'helpful' ? 'Saving...' : 'Helpful'}
              onClick={() => setFeedback('helpful')}
            />
            <FeedbackButton
              active={currentUserFeedback === 'not_helpful'}
              disabled={isSaving}
              icon={<ThumbsDown className="h-4 w-4" aria-hidden="true" />}
              label={
                isSaving && currentUserFeedback !== 'not_helpful' ? 'Saving...' : 'Not helpful'
              }
              onClick={() => setFeedback('not_helpful')}
            />
          </div>
        ) : (
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <button
              type="button"
              onClick={async () => {
                setSignInError(null)
                try {
                  const { error } = await startGitHubSignIn(nextPath)

                  if (error) {
                    setSignInError('Could not start sign in')
                  }
                } catch {
                  setSignInError('Could not start sign in')
                }
              }}
              className={cn(
                'inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 font-medium text-sm',
                'hover:border-accent/40 hover:bg-accent/5',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
              )}
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              <span>Sign in</span>
            </button>
            {signInError && <p className="text-destructive text-xs">{signInError}</p>}
          </div>
        )}
      </div>
    </section>
  )
}
