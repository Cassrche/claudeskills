import { prisma } from '@repo/auth/prisma'
import { routeAudits, routeHome, routeMcp, routeRule } from '@repo/config'
import { PageBreadcrumbs } from '@repo/design-system/custom/navigation/page-breadcrumbs'
import { allRules } from 'content-collections'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { SITE_LANGUAGE } from '@/app/(site)/layout'
import { pageMetadata } from '@/lib/seo'

/** Generates page metadata with the audit's public ID in the title. */
export async function generateMetadata({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params
  return {
    ...pageMetadata.report,
    title: `Audit report · ${publicId}`
  }
}

interface PageProps {
  params: Promise<{ publicId: string }>
}

/**
 * Resolve and render a public audit report.
 *
 * @param props - Route params for the report share identifier.
 * @returns The public audit report page content.
 */
async function ReportPageContent({ params }: PageProps) {
  const { publicId } = await params
  const lang = SITE_LANGUAGE
  const audit = await prisma.audit.findUnique({
    where: { publicId }
  })
  if (!audit) notFound()

  const result = audit.result as {
    summary?: {
      totalChecks?: number
      issuesFound?: number
      criticalIssues?: number
      highIssues?: number
      categories?: string[]
    }
    issues?: Array<{ rule: string; title: string; priority: string; issue: string }>
    suggestions?: string[]
    source?: { url: string; fetchedAt?: string }
  }
  const summary = result?.summary ?? {}
  const issues = result?.issues ?? []
  const suggestions = result?.suggestions ?? []

  const slugToCategory = new Map<string, string>()
  for (const r of allRules) {
    if (r.language === lang) slugToCategory.set(r.slug, r.primaryCategory)
  }

  return (
    <div className="container-content py-12 sm:py-16 lg:pt-5 lg:pb-20">
      <PageBreadcrumbs
        items={[
          { label: 'Home', href: routeHome() },
          { label: 'Audits', href: routeAudits() },
          { label: 'Report' }
        ]}
      />

      <header className="mb-8">
        <h1 className="font-medium text-3xl text-foreground tracking-tight">Audit report</h1>
        <p className="mt-2 break-all text-foreground-muted">{result?.source?.url ?? audit.url}</p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <span>Checks: {summary.totalChecks ?? 0}</span>
          <span>Issues: {summary.issuesFound ?? 0}</span>
          <span className="text-red-600 dark:text-red-400">
            Critical: {summary.criticalIssues ?? 0}
          </span>
          <span className="text-amber-600 dark:text-amber-400">
            High: {summary.highIssues ?? 0}
          </span>
        </div>
      </header>

      {issues.length > 0 ? (
        <section className="mb-10">
          <h2 className="mb-4 font-medium text-foreground text-xl">Issues</h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border border-b bg-background-subtle">
                  <th className="p-3 text-left font-medium">Priority</th>
                  <th className="p-3 text-left font-medium">Rule</th>
                  <th className="p-3 text-left font-medium">Title</th>
                  <th className="p-3 text-left font-medium">Issue</th>
                  <th className="p-3 text-left font-medium">Fix</th>
                </tr>
              </thead>
              <tbody>
                {issues.map(issue => {
                  const category = slugToCategory.get(issue.rule)
                  const ruleUrl = category ? routeRule(category, issue.rule) : null
                  const issueKey = `${issue.rule}:${issue.title}:${issue.issue}`
                  return (
                    <tr key={issueKey} className="border-border border-b last:border-0">
                      <td className="p-3">{issue.priority}</td>
                      <td className="p-3 font-mono text-xs">{issue.rule}</td>
                      <td className="p-3">{issue.title}</td>
                      <td className="p-3 text-foreground-muted">{issue.issue}</td>
                      <td className="p-3">
                        {ruleUrl ? (
                          <Link href={ruleUrl} className="text-accent text-xs hover:underline">
                            Fix guidance
                          </Link>
                        ) : (
                          <span className="text-foreground-muted text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <p className="mb-10 text-foreground-muted">No issues found.</p>
      )}

      {suggestions.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 font-medium text-foreground text-xl">Suggestions</h2>
          <ul className="list-inside list-disc space-y-2 text-foreground-muted">
            {suggestions.map(s => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-foreground-muted text-sm">
        <Link href={routeMcp()} className="text-accent hover:underline">
          Run more audits with the MCP server
        </Link>
      </p>
    </div>
  )
}

export default function ReportPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="container-content py-16">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-40 rounded bg-background-muted" />
            <div className="h-24 rounded-lg bg-background-muted" />
            <div className="h-64 rounded-lg bg-background-muted" />
          </div>
        </div>
      }
    >
      <ReportPageContent params={params} />
    </Suspense>
  )
}
