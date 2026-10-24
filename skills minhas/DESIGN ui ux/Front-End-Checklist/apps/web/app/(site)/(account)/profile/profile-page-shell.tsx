'use client'

import { useEffect, useState } from 'react'
import { QueryProvider } from '@/providers/query-provider'
import { ProfilePageClient } from './profile-page-client'

/**
 * Delays rendering of the authenticated profile client tree until after hydration.
 */
export function ProfilePageShell() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 rounded bg-background-muted" />
        <div className="h-32 rounded-lg bg-background-muted" />
        <div className="h-32 rounded-lg bg-background-muted" />
      </div>
    )
  }

  return (
    <QueryProvider>
      <ProfilePageClient />
    </QueryProvider>
  )
}
