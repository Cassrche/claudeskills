import { routeHome } from '@repo/config'
import type { BreadcrumbItemData } from '@repo/design-system/custom/navigation/breadcrumb'
import { PageBreadcrumbs } from '@repo/design-system/custom/navigation/page-breadcrumbs'
import { allGuides } from 'content-collections'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SITE_LANGUAGE } from '@/app/(site)/layout'
import { PageHero } from '@/components/content/page/page-hero'
import { GuideCard } from '@/components/guides/guide-card'
import { GuideFilters } from '@/components/guides/guide-filters'
import { pageMetadata, siteConfig } from '@/lib/seo'

export const metadata: Metadata = pageMetadata.guides

const BASE_URL = siteConfig.url

interface GuidesPageProps {
  searchParams?: Promise<{
    category?: string
    tag?: string
    type?: string
  }>
}

/**
 * Renders the guides hub with featured and latest sections.
 */
export async function GuidesPageContent({
  searchParamsPromise
}: {
  searchParamsPromise?: GuidesPageProps['searchParams']
}) {
  const params = searchParamsPromise ? await searchParamsPromise : undefined
  const selectedCategory = params?.category
  const selectedTag = params?.tag
  const selectedType = params?.type

  const langGuides = allGuides
    .filter(guide => guide.language === SITE_LANGUAGE)
    .filter(guide => (selectedCategory ? guide.category === selectedCategory : true))
    .filter(guide => (selectedTag ? guide.tags.includes(selectedTag) : true))
    .filter(guide => (selectedType ? guide.type === selectedType : true))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  const featuredGuides = langGuides.filter(guide => guide.featured)
  const latestGuides = langGuides.filter(guide => !guide.featured)
  const availableCategories = [
    ...new Set(
      allGuides.filter(guide => guide.language === SITE_LANGUAGE).map(guide => guide.category)
    )
  ].sort()
  const availableTags = [
    ...new Set(
      allGuides.filter(guide => guide.language === SITE_LANGUAGE).flatMap(guide => guide.tags)
    )
  ].sort()

  const breadcrumbItems: BreadcrumbItemData[] = [
    { label: 'Home', href: routeHome() },
    { label: 'Guides' }
  ]

  return (
    <>
      <PageBreadcrumbs items={breadcrumbItems} baseUrl={BASE_URL} includeJsonLd />

      <PageHero
        title="Guides"
        description="Connected how-tos and insights that turn broad frontend advice into practical next steps."
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-10">
          {featuredGuides.length > 0 ? (
            <section>
              <h2 className="mb-4 font-semibold text-2xl text-foreground">Featured</h2>
              <div className="grid gap-6">
                {featuredGuides.map(guide => (
                  <GuideCard key={guide.id} guide={guide} priority="featured" />
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <h2 className="font-semibold text-2xl text-foreground">Latest</h2>
              <p className="text-foreground-muted text-sm">{langGuides.length} guides</p>
            </div>

            {latestGuides.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2">
                {latestGuides.map(guide => (
                  <GuideCard key={guide.id} guide={guide} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-border border-dashed bg-background-subtle p-8 text-foreground-muted text-sm">
                No guides match the current filters.
              </div>
            )}
          </section>
        </div>

        <GuideFilters
          categories={availableCategories}
          tags={availableTags}
          selectedCategory={selectedCategory}
          selectedTag={selectedTag}
          selectedType={selectedType}
        />
      </div>
    </>
  )
}

/**
 * Renders the guides hub behind a Suspense boundary so request-bound filters do not block the whole route.
 */
export default function GuidesPage({ searchParams }: GuidesPageProps) {
  return (
    <div className="container-content py-12 sm:py-16 lg:pt-5 lg:pb-20">
      <Suspense
        fallback={
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-28 rounded bg-background-muted" />
            <div className="h-16 max-w-2xl rounded bg-background-muted" />
            <div className="grid gap-6 md:grid-cols-2">
              <div className="h-64 rounded-xl bg-background-muted" />
              <div className="h-64 rounded-xl bg-background-muted" />
            </div>
          </div>
        }
      >
        <GuidesPageContent searchParamsPromise={searchParams} />
      </Suspense>
    </div>
  )
}
