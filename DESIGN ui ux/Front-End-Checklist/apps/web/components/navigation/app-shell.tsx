'use client'

import { ErrorBoundary, SectionErrorFallback } from '@/components/feedback/status/error-boundary'
import { CommandPaletteProvider, useCommandPalette } from './command-palette-provider'
import { Header } from './header'

interface Rule {
  id: string
  title: string
  description?: string
  slug: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  primaryCategory: string
  language: string
}

interface AppShellProps {
  rules: Rule[]
  githubStars: number | null
}

/**
 * AppShell function.
 * @param rules - rules.
 * @param githubStars } - githubStars }.
 */
export function AppShell({ rules, githubStars }: AppShellProps) {
  return (
    <CommandPaletteProvider rules={rules}>
      <AppShellContent githubStars={githubStars} />
    </CommandPaletteProvider>
  )
}

interface AppShellContentProps {
  githubStars: number | null
}

/** Short temporary banner communicating the current beta period. */
function BetaBanner() {
  return (
    <div className="border-border border-b bg-accent/10 px-4 py-2 text-center text-foreground text-sm">
      <span className="font-medium">Beta:</span> Front-End Checklist is currently in beta. Some
      issues are still being fixed. Thanks for your patience.
    </div>
  )
}

/** Renders the page layout with header, main content area, and footer. */
function AppShellContent({ githubStars }: AppShellContentProps) {
  const { openPalette } = useCommandPalette()

  return (
    <ErrorBoundary
      fallback={reset => <SectionErrorFallback sectionName="Header" onRetry={reset} />}
    >
      <div>
        <BetaBanner />
        <Header onOpenSearch={openPalette} githubStars={githubStars} />
      </div>
    </ErrorBoundary>
  )
}
