'use client'

import { RefreshCw } from '@repo/design-system/icons'
import { Button } from '@repo/design-system/ui/button'
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    Sentry.captureException(error)
    console.error('[ErrorPage]', error)
  }, [error])

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex flex-1 items-center justify-center px-4 py-24 sm:py-32"
    >
      <div className="mx-auto max-w-md text-center">
        <p className="font-bold font-heading text-8xl text-error">500</p>
        <h1 className="mt-4 font-heading font-semibold text-3xl text-foreground tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-3 text-base text-foreground-muted">
          An unexpected error occurred. Our team has been notified.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-foreground-muted text-xs">Error ID: {error.digest}</p>
        )}
        <div className="mt-8">
          <Button size="lg" onClick={reset}>
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      </div>
    </div>
  )
}
