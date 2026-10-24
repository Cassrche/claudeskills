'use client'

import { routeChecklists, routeGuides, routeHome, routeLists, routeRules } from '@repo/config'
import { Check, ListChecks, Menu, Search, X } from '@repo/design-system/icons'
import { cn } from '@repo/utils'
import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { AuthButton } from '@/components/auth/auth-button'
import { GitHubLink } from '@/components/links/github-link'
import { XLink } from '@/components/links/x-link'
import { useScrollDirection } from '@/hooks/use-scroll-direction'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'
import { trackInteraction } from '@/lib/telemetry-interactions'

interface HeaderProps {
  onOpenSearch: () => void
  githubStars: number | null
}

/**
 * Renders the main site header with navigation, search, and auth actions.
 * @param props - Search callback and GitHub metadata for the header controls.
 * @returns The responsive site header.
 */
export function Header({ onOpenSearch, githubStars }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const scrollDirection = useScrollDirection(10)
  const isHidden = scrollDirection === 'down' && !mobileMenuOpen

  // Close mobile menu on escape
  useEffect(() => {
    /**
     * Closes the mobile navigation when the escape key is pressed.
     * @param e - Keyboard event fired on the document.
     * @returns Nothing.
     */
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  /** Close the mobile navigation menu after a navigation action. */
  const closeMobileMenu = () => setMobileMenuOpen(false)

  /** Open search and record the surface used to trigger it. */
  const handleOpenSearch = (label: string) => {
    trackInteraction(TELEMETRY_EVENTS.searchOpened, {
      label,
      location: 'header'
    })
    onOpenSearch()
  }

  /** Toggle the mobile menu and record the explicit menu button action. */
  const handleMobileMenuToggle = () => {
    const nextOpen = !mobileMenuOpen
    trackInteraction(TELEMETRY_EVENTS.ctaClicked, {
      label: nextOpen ? 'open_mobile_menu' : 'close_mobile_menu',
      location: 'header',
      target: 'mobile_menu'
    })
    setMobileMenuOpen(nextOpen)
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-40 h-[60px] w-full',
        'border-border border-b',
        'bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80',
        'transition-transform duration-300 ease-in-out',
        isHidden && '-translate-y-full'
      )}
    >
      <div className="container-wide flex h-full items-center justify-between">
        {/* Left section: Logo + Navigation */}
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link
            href={routeHome()}
            className="flex items-center gap-2 rounded-md text-foreground transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded bg-accent text-accent-foreground">
              <Check className="h-4 w-4" strokeWidth={3} />
            </div>
            <span className="hidden font-semibold text-lg sm:inline">Front-End Checklist</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            <NavLink href={routeRules()}>Rules</NavLink>
            <NavLink href={routeChecklists()}>Checklists</NavLink>
            <NavLink href={routeGuides()}>Guides</NavLink>
          </nav>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* GitHub Link */}
          <GitHubLink starsCount={githubStars} />

          {/* X Link */}
          <XLink />

          {/* Search Button - Desktop */}
          <button
            type="button"
            onClick={() => handleOpenSearch('desktop_search')}
            className={cn(
              'hidden h-9 items-center gap-2 rounded-md px-3 sm:flex',
              'border border-border bg-background-subtle',
              'text-foreground-muted text-sm',
              'hover:bg-background-muted hover:text-foreground',
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden lg:inline">Search</span>
            <kbd className="ml-2 hidden h-5 items-center gap-0.5 rounded border border-border bg-background px-1.5 font-mono text-foreground-muted text-xs lg:inline-flex">
              <span>⌘</span>K
            </kbd>
          </button>

          {/* Search Button - Mobile (44px touch target) */}
          <button
            type="button"
            onClick={() => handleOpenSearch('mobile_search')}
            className={cn(
              'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md sm:hidden',
              'transition-colors hover:bg-background-subtle',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
            aria-label="Search rules"
          >
            <Search className="h-5 w-5 text-foreground-muted" aria-hidden="true" />
          </button>

          {/* Lists */}
          <Link
            href={routeLists()}
            onClick={() =>
              trackInteraction(TELEMETRY_EVENTS.ctaClicked, {
                label: 'header_lists',
                location: 'header',
                target: routeLists()
              })
            }
            className={cn(
              'hidden h-9 items-center gap-1.5 rounded-md px-3 md:flex',
              'font-medium text-foreground-muted text-sm',
              'hover:bg-background-subtle hover:text-foreground',
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            <ListChecks className="h-4 w-4" aria-hidden="true" />
            <span className="hidden lg:inline">Lists</span>
          </Link>

          {/* Auth */}
          <Suspense>
            <AuthButton />
          </Suspense>

          {/* Mobile Menu Toggle (44px touch target) */}
          <button
            type="button"
            className={cn(
              'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md md:hidden',
              'transition-colors hover:bg-background-subtle',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
            onClick={handleMobileMenuToggle}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5 text-foreground-muted" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5 text-foreground-muted" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop - purely decorative, click handled via aria-hidden */}
          <div
            className="fixed inset-0 top-[60px] cursor-pointer bg-black/20 md:hidden"
            onClick={closeMobileMenu}
            onKeyDown={e => e.key === 'Escape' && closeMobileMenu()}
            role="presentation"
          />

          {/* Menu Panel */}
          <nav
            id="mobile-menu"
            className="fixed top-[60px] right-0 left-0 border-border border-b bg-background shadow-lg md:hidden"
            aria-label="Mobile navigation"
          >
            <div className="container-wide space-y-1 py-4">
              <MobileNavLink href={routeRules()} onClick={closeMobileMenu}>
                Rules
              </MobileNavLink>
              <MobileNavLink href={routeChecklists()} onClick={closeMobileMenu}>
                Checklists
              </MobileNavLink>
              <MobileNavLink href={routeGuides()} onClick={closeMobileMenu}>
                Guides
              </MobileNavLink>
              <hr className="my-2 border-border" />
              <MobileNavLink href={routeLists()} onClick={closeMobileMenu}>
                Lists
              </MobileNavLink>
              <div className="px-3 py-1">
                <Suspense>
                  <AuthButton mobile />
                </Suspense>
              </div>
            </div>
          </nav>
        </>
      )}
    </header>
  )
}

/**
 * Renders a desktop navigation link in the header.
 * @param props - Link destination and label content.
 * @returns A styled desktop navigation link.
 */
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-md px-3 py-2 font-medium text-sm',
        'text-foreground-muted',
        'hover:bg-background-subtle hover:text-foreground',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
    >
      {children}
    </Link>
  )
}

/**
 * Renders a mobile navigation link that also closes the menu on click.
 * @param props - Link destination, click handler, and label content.
 * @returns A styled mobile navigation link.
 */
function MobileNavLink({
  href,
  onClick,
  children
}: {
  href: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'block rounded-md px-3 py-2.5 font-medium text-sm',
        'text-foreground',
        'hover:bg-background-subtle',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
    >
      {children}
    </Link>
  )
}
