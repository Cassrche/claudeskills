'use client'

import { authClient } from '@repo/auth/auth-client'
import { routeProfile, routeSettings } from '@repo/config'
import { ExternalLink, Loader2, LogOut, Settings, User } from '@repo/design-system/icons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@repo/design-system/ui/dropdown-menu'
import { cn } from '@repo/utils'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useHydrated } from '@/hooks/use-hydrated'
import { signOutCurrentUser, startGitHubSignIn } from '@/lib/auth-actions'
import { fetchPublicProfileHref, type PublicProfileShortcutState } from './auth-button-profile'

interface AuthButtonProps {
  mobile?: boolean
  className?: string
}

/**
 * Renders sign-in (when signed out) or an avatar dropdown with sign-out (when signed in).
 * @param props - Button display options for mobile and desktop layouts.
 * @returns The auth action UI for the current session state.
 */
export function AuthButton({ mobile = false, className }: AuthButtonProps) {
  const pathname = usePathname()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [publicProfileShortcut, setPublicProfileShortcut] = useState<PublicProfileShortcutState>({
    href: null
  })
  const { data: session, isPending } = authClient.useSession()
  const hasHydrated = useHydrated()
  const user = session?.user
  const userId = user?.id

  const nextPath = pathname || '/'

  /**
   * Load the latest public profile route for account-menu shortcuts.
   */
  const loadPublicProfileHref = async () => {
    const href = await fetchPublicProfileHref()
    setPublicProfileShortcut({ href, userId })
  }

  useEffect(() => {
    if (!(mobile && userId)) {
      return
    }

    let isCurrent = true

    void fetchPublicProfileHref().then(href => {
      if (isCurrent) {
        setPublicProfileShortcut({ href, userId })
      }
    })

    return () => {
      isCurrent = false
    }
  }, [mobile, userId])

  /**
   * Sign out the current user and surface failures inline.
   */
  const handleSignOut = async () => {
    setErrorMessage(null)
    try {
      const { error } = await signOutCurrentUser()
      if (error) {
        setErrorMessage('Could not sign out')
      }
    } catch {
      setErrorMessage('Could not sign out')
    }
  }

  /**
   * Start GitHub sign-in and surface failures inline.
   */
  const handleSignIn = async () => {
    setErrorMessage(null)
    try {
      const { error } = await startGitHubSignIn(nextPath)
      if (error) {
        setErrorMessage('Could not start sign in')
      }
    } catch {
      setErrorMessage('Could not start sign in')
    }
  }

  /**
   * Refresh profile shortcut availability when the desktop account menu opens.
   * @param open - Whether the dropdown menu is opening.
   */
  const handleAccountMenuOpenChange = (open: boolean) => {
    if (open) {
      void loadPublicProfileHref()
    }
  }

  /**
   * Start loading account shortcut data as soon as the menu trigger is activated.
   */
  const handleAccountMenuTrigger = () => {
    void loadPublicProfileHref()
  }

  if (!(hasHydrated && !isPending)) {
    return (
      <span
        className={cn(
          mobile
            ? 'flex min-h-[44px] w-full items-center justify-start gap-1.5 px-3 py-2.5'
            : 'hidden h-9 items-center gap-1.5 px-3 md:flex',
          'rounded-md font-medium text-foreground-muted text-sm',
          className
        )}
      >
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        <span>Loading</span>
      </span>
    )
  }

  if (user) {
    const avatarUrl = user.image
    const displayName = user.name ?? user.email ?? 'Account'
    const publicProfileHref =
      publicProfileShortcut.userId === userId ? publicProfileShortcut.href : null

    if (mobile) {
      return (
        <div className={cn('flex w-full flex-col gap-1', className)}>
          {publicProfileHref && (
            <Link
              href={publicProfileHref}
              className={cn(
                'flex min-h-[44px] w-full items-center gap-2 rounded-md px-3 py-2.5',
                'font-medium text-foreground-muted text-sm',
                'transition-colors hover:bg-background-subtle hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
            >
              <ExternalLink className="size-5" aria-hidden="true" />
              <span>View public profile</span>
            </Link>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className={cn(
              'flex min-h-[44px] w-full items-center gap-2 rounded-md px-3 py-2.5',
              'font-medium text-foreground-muted text-sm',
              'transition-colors hover:bg-background-subtle hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" width={24} height={24} className="rounded-full" />
            ) : (
              <User className="size-5" aria-hidden="true" />
            )}
            <span>Sign out</span>
          </button>
          {errorMessage && <span className="px-3 text-destructive text-xs">{errorMessage}</span>}
        </div>
      )
    }

    return (
      <div className={cn('hidden items-center md:flex', className)}>
        <DropdownMenu onOpenChange={handleAccountMenuOpenChange}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'flex size-8 items-center justify-center rounded-full',
                'transition-opacity hover:opacity-80',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
              )}
              aria-label="Account menu"
              onPointerDown={handleAccountMenuTrigger}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  handleAccountMenuTrigger()
                }
              }}
            >
              {avatarUrl ? (
                <Image src={avatarUrl} alt="" width={32} height={32} className="rounded-full" />
              ) : (
                <span className="flex size-8 items-center justify-center rounded-full bg-background-muted">
                  <User className="size-4 text-foreground-muted" aria-hidden="true" />
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8}>
            <div className="px-3 py-2">
              <p className="font-medium text-foreground text-sm">{displayName}</p>
              {user.email && displayName !== user.email && (
                <p className="text-foreground-muted text-xs">{user.email}</p>
              )}
            </div>
            <DropdownMenuSeparator />
            {publicProfileHref && (
              <DropdownMenuItem asChild>
                <Link href={publicProfileHref} className="flex cursor-pointer items-center gap-2">
                  <ExternalLink className="size-4" aria-hidden="true" />
                  <span>View public profile</span>
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href={routeProfile()} className="flex cursor-pointer items-center gap-2">
                <User className="size-4" aria-hidden="true" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={routeSettings()} className="flex cursor-pointer items-center gap-2">
                <Settings className="size-4" aria-hidden="true" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="size-4" aria-hidden="true" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {errorMessage && <span className="ml-2 text-destructive text-xs">{errorMessage}</span>}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-1', mobile ? 'w-full' : 'hidden items-end md:flex')}>
      <button
        type="button"
        onClick={handleSignIn}
        className={cn(
          mobile
            ? 'flex min-h-[44px] w-full items-center justify-start gap-1.5 rounded-md px-3 py-2.5'
            : 'flex h-9 items-center gap-1.5 rounded-md px-3',
          'font-medium text-sm transition-colors duration-150',
          'bg-accent text-accent-foreground hover:bg-accent-hover',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className
        )}
      >
        <span>Sign in</span>
      </button>
      {errorMessage && <span className="text-destructive text-xs">{errorMessage}</span>}
    </div>
  )
}
