'use client'

import { Check, Loader2, Mail } from '@repo/design-system/icons'
import { Button } from '@repo/design-system/ui/button'
import { Input } from '@repo/design-system/ui/input'
import { useState } from 'react'

type Status = 'idle' | 'loading' | 'success' | 'error'

/**
 * Email capture form for "Get notified when our CLI launches" on the MCP docs page.
 * Submits to the existing /api/waitlist endpoint.
 */
export function CliNotifyForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  /** Submits the email to the waitlist API endpoint. */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return

    setStatus('loading')
    setErrorMessage('')

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed })
      })

      const data = (await res.json()) as { success?: boolean; error?: string }

      if (!res.ok) {
        setStatus('error')
        setErrorMessage(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      setStatus('success')
      setEmail('')
    } catch {
      setStatus('error')
      setErrorMessage('Network error. Please try again.')
    }
  }

  return (
    <div className="max-w-md space-y-3">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Mail
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-foreground-muted"
            aria-hidden
          />
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={status === 'loading' || status === 'success'}
            className="w-full pl-9"
            autoComplete="email"
            aria-label="Email address"
            required
          />
        </div>
        <Button
          type="submit"
          disabled={status === 'loading' || status === 'success' || !email.trim()}
          className="shrink-0 gap-2"
        >
          {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {status === 'success' && <Check className="h-4 w-4" aria-hidden />}
          {status === 'success' ? 'Subscribed' : 'Notify me'}
        </Button>
      </form>
      {status === 'error' && (
        <p className="text-red-600 text-sm dark:text-red-400" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  )
}
