import { prisma } from '@repo/auth/prisma'
import { isChecklistFramework, ROUTES } from '@repo/config'
import { allRules } from 'content-collections'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SITE_LANGUAGE } from '@/app/(site)/layout'
import { generateSEOMetadata } from '@/lib/seo'
import { QueryProvider } from '@/providers/query-provider'
import { SharedChecklistView } from './shared-checklist-view'

interface PageProps {
  params: Promise<{ publicId: string }>
}

/**
 * Generate metadata for a shared checklist page.
 *
 * @param props - Route params containing the shared checklist public ID.
 * @returns Metadata for the shared checklist page.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { publicId } = await params
  const checklist = await prisma.userChecklist.findUnique({
    where: { publicId }
  })
  const title = checklist ? `${checklist.name} · Shared checklist` : 'Shared checklist'
  return generateSEOMetadata({
    title,
    description: checklist?.description ?? 'View a shared frontend checklist.',
    path: `${ROUTES.sharedChecklist}/${publicId}`,
    noIndex: false
  })
}

/**
 * Resolve the shared checklist and render its public view.
 *
 * @param props - Route params for the public checklist identifier.
 * @returns The shared checklist content when found.
 */
async function SharedChecklistPageContent({ params }: PageProps) {
  const { publicId } = await params
  const lang = SITE_LANGUAGE

  const checklist = await prisma.userChecklist.findUnique({
    where: { publicId }
  })

  if (!checklist) {
    return (
      <div className="container-content py-16 text-center">
        <h2 className="mb-2 font-medium text-foreground text-lg">Checklist not found</h2>
        <p className="text-foreground-muted">
          This list may have been unshared or the link is invalid.
        </p>
      </div>
    )
  }

  const langRules = allRules.filter(rule => rule.language === lang)
  const ruleMap = new Map(langRules.map(r => [r.id, r]))
  const rules = checklist.ruleIds
    .map((id: string) => ruleMap.get(id))
    .filter((r): r is (typeof langRules)[0] => r != null)
    .map(rule => ({
      id: rule.id,
      title: rule.title,
      description: rule.description,
      slug: rule.slug,
      priority: rule.priority,
      primaryCategory: rule.primaryCategory,
      categories: rule.categories,
      subcategory: rule.subcategory
    }))

  return (
    <QueryProvider>
      <SharedChecklistView
        publicId={publicId}
        name={checklist.name}
        description={checklist.description ?? undefined}
        framework={isChecklistFramework(checklist.framework) ? checklist.framework : undefined}
        rules={rules}
      />
    </QueryProvider>
  )
}

export default function SharedChecklistPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="container-content py-16">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-56 rounded bg-background-muted" />
            <div className="h-24 rounded-lg bg-background-muted" />
            <div className="h-64 rounded-lg bg-background-muted" />
          </div>
        </div>
      }
    >
      <SharedChecklistPageContent params={params} />
    </Suspense>
  )
}
