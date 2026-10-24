'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error)
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="m-0 flex min-h-screen items-center justify-center bg-white font-sans text-neutral-900">
        <div role="alert" aria-live="assertive" className="p-8 text-center">
          <p className="m-0 font-bold text-[5rem] text-red-500 leading-none">500</p>
          <h1 className="mt-4 font-semibold text-2xl tracking-tight">Something went wrong</h1>
          <p className="mt-3 text-base text-neutral-600">
            A critical error occurred. Please try refreshing the page.
          </p>
          {error.digest && (
            <p className="mt-2 font-mono text-neutral-500 text-xs">Error ID: {error.digest}</p>
          )}
          <button
            type="button"
            onClick={reset}
            className="mt-8 cursor-pointer rounded-md border-0 bg-[#5e6ad2] px-6 py-3 font-medium text-sm text-white"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
