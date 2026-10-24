'use client'

import { authClient } from '@repo/auth/auth-client'
import { routeLists } from '@repo/config'
import { ChevronRight, PlayCircle } from '@repo/design-system/icons'
import { Button } from '@repo/design-system/ui/button'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useProgress } from '@/hooks/use-progress'

/**
 * Banner shown when the user has rule completion progress, linking to Lists.
 * When not signed in, copy nudges toward signing in to save progress.
 *
 */
export function ResumeBanner() {
  const { data: session } = authClient.useSession()
  const { isLoading, progress } = useProgress()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isLoading) {
      return
    }

    const completedRulesCount = progress.filter(item => item.completed).length
    if (completedRulesCount > 0) {
      setIsVisible(true)
    }
  }, [isLoading, progress])

  if (!isVisible) return null

  const isSignedIn = Boolean(session?.user?.id)
  const label = isSignedIn ? 'Pick up where you left off' : 'Sign in to save your progress'

  return (
    <div className="slide-in-from-bottom-5 fade-in fixed bottom-4 left-1/2 z-50 -translate-x-1/2 animate-in duration-300">
      <div className="flex items-center gap-4 rounded-full border border-border bg-card py-2 pr-2 pl-5 shadow-lg">
        <div className="flex items-center gap-2">
          <PlayCircle className="h-5 w-5 text-accent" />
          <span className="whitespace-nowrap font-medium text-foreground text-sm">{label}</span>
        </div>
        <Button asChild size="sm" className="h-8 rounded-full px-4">
          <Link href={routeLists()}>
            {isSignedIn ? 'Resume' : 'Sign in'}
            <ChevronRight className="-mr-1 ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
