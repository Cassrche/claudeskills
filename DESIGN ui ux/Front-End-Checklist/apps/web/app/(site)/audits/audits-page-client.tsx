'use client'

import { authClient } from '@repo/auth/auth-client'
import { routeHome, routeReport } from '@repo/config'
import { PageBreadcrumbs } from '@repo/design-system/custom/navigation/page-breadcrumbs'
import { AlertCircle, ExternalLink, Loader2 } from '@repo/design-system/icons'
import { cn } from '@repo/utils'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { AuthButton } from '@/components/auth/auth-button'

interface AuditSummary {
  id: string
  publicId: string
  url: string
  summary: {
    issuesFound?: number
    criticalIssues?: number
    highIssues?: number
    totalChecks?: number
  }
  createdAt: string
}

/**
 * Fetch the signed-in user's saved audits.
 *
 * @returns Audit summaries for the current user, or an empty list when unauthenticated.
 */
async function fetchAudits(): Promise<AuditSummary[]> {
  const response = await fetch('/api/audits')

  if (response.status === 401) {
    return []
  }

  if (!response.ok) {
    throw new Error('Failed to load audits')
  }

  const data = await response.json()
  return Array.isArray(data) ? data : []
}

/**
 * Render the audits history page with loading, empty, and signed-out states.
 *
 * @returns The audits page client UI.
 */
export function AuditsPageClient() {
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const {
    data: audits = [],
    error,
    isPending: auditsPending
  } = useQuery({
    queryKey: ['audits'],
    queryFn: fetchAudits,
    enabled: Boolean(session),
    staleTime: 60_000
  })

  const errorMessage = error instanceof Error ? error.message : 'Failed to load audits'

  return (
    <div className="container-content py-12 sm:py-16 lg:pt-5 lg:pb-20">
      <PageBreadcrumbs items={[{ label: 'Home', href: routeHome() }, { label: 'Audits' }]} />

      <header className="mb-12">
        <h1 className="font-medium text-5xl text-foreground tracking-tight">Audit history</h1>
        <p className="mt-4 max-w-2xl text-foreground-muted">
          View and share your saved frontend audits. Sign in to see audits linked to your account.
        </p>
      </header>

      {sessionPending || (session && auditsPending) ? (
        <div className="flex items-center gap-2 text-foreground-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span>Loading…</span>
        </div>
      ) : !session ? (
        <div className="max-w-md rounded-xl border border-border bg-card p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-foreground-muted" aria-hidden />
            <div>
              <h2 className="font-medium text-foreground text-sm">Sign in to see your audits</h2>
              <p className="mt-1 text-foreground-muted text-sm">
                Audits you save while signed in will appear here. You can still run audits and share
                report links without an account.
              </p>
              <AuthButton />
            </div>
          </div>
        </div>
      ) : error ? (
        <p className="text-red-600 dark:text-red-400">{errorMessage}</p>
      ) : audits.length === 0 ? (
        <p className="text-foreground-muted">
          No audits yet. Run an audit from the CLI or MCP and save the result to see it here.
        </p>
      ) : (
        <ul className="space-y-3">
          {audits.map(audit => (
            <li
              key={audit.id}
              className="group relative flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-background-subtle"
            >
              <div className="min-w-0 flex-1">
                <p className="max-w-md truncate font-medium text-foreground">
                  <Link
                    href={routeReport(audit.publicId)}
                    className={cn(
                      'after:absolute after:inset-0 after:content-[""]',
                      'focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring'
                    )}
                  >
                    {audit.url}
                  </Link>
                </p>
                <p className="mt-0.5 text-foreground-muted text-sm">
                  {audit.summary?.issuesFound ?? 0} issues
                  {(audit.summary?.criticalIssues ?? 0) > 0 && (
                    <span className="ml-2 text-red-600 dark:text-red-400">
                      {audit.summary.criticalIssues} critical
                    </span>
                  )}
                  {' · '}
                  {new Date(audit.createdAt).toLocaleDateString()}
                </p>
              </div>
              <ExternalLink className="h-4 w-4 shrink-0 text-foreground-muted" aria-hidden />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
