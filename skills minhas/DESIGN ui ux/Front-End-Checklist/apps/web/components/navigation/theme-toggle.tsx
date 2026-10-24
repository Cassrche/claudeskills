'use client'

import { Monitor, Moon, Sun } from '@repo/design-system/icons'
import { cn } from '@repo/utils'
import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'

/**
 * useHasMounted function.
 */
function useHasMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}

/**
 * ThemeToggle function.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const mounted = useHasMounted()

  if (!mounted) {
    return (
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-background-subtle"
        aria-label="Toggle theme"
        disabled
      >
        <div className="h-4 w-4 animate-pulse rounded bg-background-muted" />
      </button>
    )
  }

  /**
   * cycleTheme function.
   */
  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-md',
        'transition-colors hover:bg-background-subtle',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      )}
      aria-label={`Current theme: ${theme}. Click to change.`}
    >
      {theme === 'light' && <Sun className="h-4 w-4 text-foreground-muted" aria-hidden="true" />}
      {theme === 'dark' && <Moon className="h-4 w-4 text-foreground-muted" aria-hidden="true" />}
      {theme === 'system' && (
        <Monitor className="h-4 w-4 text-foreground-muted" aria-hidden="true" />
      )}
    </button>
  )
}

/**
 * Compact theme toggle for tight spaces - just shows sun/moon based on resolved theme
 */
export function ThemeToggleCompact() {
  const { setTheme, resolvedTheme } = useTheme()
  const mounted = useHasMounted()

  if (!mounted) {
    return (
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-md"
        aria-label="Toggle theme"
        disabled
      >
        <div className="h-4 w-4" />
      </button>
    )
  }

  /**
   * toggleTheme function.
   */
  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'h-8 min-h-[44px] w-8 min-w-[44px] sm:h-8 sm:min-h-0 sm:w-8 sm:min-w-0',
        'flex items-center justify-center rounded-md',
        'transition-colors hover:bg-background-subtle',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      )}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-4 w-4 text-foreground-muted sm:h-4 sm:w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4 text-foreground-muted sm:h-4 sm:w-4" aria-hidden="true" />
      )}
    </button>
  )
}

/**
 * Theme toggle with label - for footer usage
 */
export function ThemeToggleWithLabel() {
  const { setTheme, resolvedTheme } = useTheme()
  const mounted = useHasMounted()

  if (!mounted) {
    return (
      <button
        type="button"
        className="flex h-9 items-center gap-2 rounded-md px-3"
        aria-label="Toggle theme"
        disabled
      >
        <div className="h-4 w-4" />
        <span className="text-foreground-muted text-sm">Theme</span>
      </button>
    )
  }

  /**
   * toggleTheme function.
   */
  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'flex h-9 items-center gap-2 rounded-md px-3',
        'text-foreground-muted text-sm',
        'hover:bg-background-subtle hover:text-foreground',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {resolvedTheme === 'dark' ? (
        <>
          <Sun className="h-4 w-4" aria-hidden="true" />
          <span>Light</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4" aria-hidden="true" />
          <span>Dark</span>
        </>
      )}
    </button>
  )
}
