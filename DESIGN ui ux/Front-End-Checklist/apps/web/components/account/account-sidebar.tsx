'use client'

import { routeProfile, routeSettings } from '@repo/config'
import type { LucideIcon } from '@repo/design-system/icons'
import { Settings, User as UserIcon } from '@repo/design-system/icons'
import { cn } from '@repo/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems: Array<{
  href: () => string
  label: string
  Icon: LucideIcon
}> = [
  { href: () => routeProfile(), label: 'Profile', Icon: UserIcon },
  { href: () => routeSettings(), label: 'Settings', Icon: Settings }
]

/**
 * Sidebar navigation for account pages (profile, settings).
 * Desktop: vertical sticky sidebar; mobile: horizontal scrollable tabs.
 */
export function AccountSidebar() {
  const pathname = usePathname()

  const profilePath = routeProfile()
  const settingsPath = routeSettings()

  /**
   * Check whether the given sidebar destination matches the current pathname.
   *
   * @param href - Sidebar destination path.
   * @returns True when the current page should highlight this nav item.
   */
  function isActive(href: string): boolean {
    if (href === profilePath)
      return pathname === profilePath || pathname?.startsWith(`${profilePath}/`)
    if (href === settingsPath) return pathname === settingsPath
    return pathname === href
  }

  return (
    <>
      {/* Desktop: vertical sidebar */}
      <aside className="hidden md:block" aria-label="Account navigation">
        <nav className="sticky top-24 flex flex-col gap-0.5">
          {navItems.map(({ href, label, Icon }) => {
            const path = href()
            const active = isActive(path)
            return (
              <Link
                key={path}
                href={path}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 font-medium text-sm transition-colors',
                  active
                    ? 'bg-accent text-accent-foreground'
                    : 'text-foreground-muted hover:bg-background-subtle hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden={true} />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Mobile: horizontal scrollable tabs */}
      <nav
        className="flex gap-1 overflow-x-auto border-border border-b pb-4 md:hidden"
        aria-label="Account navigation"
      >
        {navItems.map(({ href, label, Icon }) => {
          const path = href()
          const active = isActive(path)
          return (
            <Link
              key={path}
              href={path}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full border border-border px-4 py-2 font-medium text-sm transition-colors',
                active
                  ? 'border-accent bg-accent text-accent-foreground'
                  : 'bg-background-subtle text-foreground-muted hover:bg-background-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" aria-hidden={true} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
