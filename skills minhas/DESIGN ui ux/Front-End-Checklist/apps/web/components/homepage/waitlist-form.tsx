'use client'

import { CheckCircle2 } from '@repo/design-system/icons'
import { Button } from '@repo/design-system/ui/button'
import { Input } from '@repo/design-system/ui/input'
import type { WaitlistSchema } from '@repo/schemas'
import { waitlistSchema } from '@repo/schemas'
import { useForm } from '@tanstack/react-form'
import { useState } from 'react'

type SubmitState = 'idle' | 'loading' | 'success' | 'error'

/**
 * WaitlistForm function.
 */
export function WaitlistForm() {
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      email: ''
    } satisfies WaitlistSchema,
    onSubmit: async ({ value }) => {
      const parsed = waitlistSchema.safeParse(value)
      if (!parsed.success) {
        const first = parsed.error.issues?.[0]
        setSubmitError(first?.message ?? 'Invalid email')
        setSubmitState('error')
        return
      }
      setSubmitState('loading')
      setSubmitError(null)
      try {
        const res = await fetch('/api/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: parsed.data.email })
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setSubmitError(data.error ?? 'Something went wrong. Please try again.')
          setSubmitState('error')
          return
        }
        setSubmitState('success')
      } catch {
        setSubmitError('Something went wrong. Please try again.')
        setSubmitState('error')
      }
    }
  })

  /**
   * Submits the TanStack form through the server-action form boundary.
   */
  const submitWaitlist = async () => {
    await form.handleSubmit()
  }

  if (submitState === 'success') {
    return (
      <p className="flex items-center gap-2 text-foreground-muted text-sm">
        <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
        You're on the list. We'll notify you when pro features are ready.
      </p>
    )
  }

  return (
    <form action={submitWaitlist} className="flex flex-col gap-2">
      <form.Field name="email">
        {field => (
          <>
            <div className="flex items-center gap-2">
              <Input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={e => field.handleChange(e.target.value)}
                disabled={submitState === 'loading'}
                className="w-[260px] shrink-0"
                aria-invalid={submitError != null || field.state.meta.errors.length > 0}
                aria-describedby={
                  submitError
                    ? 'waitlist-submit-error'
                    : field.state.meta.errors.length
                      ? 'waitlist-email-error'
                      : undefined
                }
              />
              <Button type="submit" disabled={submitState === 'loading'}>
                {submitState === 'loading' ? 'Joining…' : 'Join Waitlist'}
              </Button>
            </div>
            {field.state.meta.errors.length > 0 && (
              <span id="waitlist-email-error" className="text-destructive text-xs">
                {field.state.meta.errors.join(', ')}
              </span>
            )}
          </>
        )}
      </form.Field>
      {submitError && (
        <span id="waitlist-submit-error" className="text-destructive text-xs" role="alert">
          {submitError}
        </span>
      )}
    </form>
  )
}
