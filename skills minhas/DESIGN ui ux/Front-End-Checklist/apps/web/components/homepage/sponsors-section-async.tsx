import { Heart } from '@repo/design-system/icons'
import { fetchAllSponsors } from '@/lib/sponsors-server'
import { SponsorsSection } from './sponsors-section'

/**
 * Async Server Component that fetches sponsor data and renders the sponsors section.
 * Must be wrapped in {@link Suspense} so the fetch does not block page navigation.
 */
export async function SponsorsSectionAsync() {
  const sponsorsData = await fetchAllSponsors()

  return (
    <SponsorsSection
      sponsors={sponsorsData.sponsors}
      githubSponsorsUrl={sponsorsData.githubSponsorsUrl}
      openCollectiveUrl={sponsorsData.openCollectiveUrl}
    />
  )
}

/** Skeleton shown while sponsor data is streaming. */
export function SponsorsSectionFallback() {
  return (
    <section aria-labelledby="sponsors-heading-fallback" className="py-16 sm:py-20 lg:py-24">
      <div className="container-content">
        <div className="mb-10 text-center">
          <div className="mb-2 inline-flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            <span className="font-medium text-pink-500 text-sm uppercase tracking-wider">
              Sponsors
            </span>
          </div>
          <h2
            id="sponsors-heading-fallback"
            className="font-heading font-semibold text-3xl text-foreground"
          >
            Supported by Amazing Sponsors
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-foreground-muted">
            Thank you to all our sponsors for supporting the Front-End Checklist project.
          </p>
        </div>
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-200 border-t-pink-500" />
        </div>
      </div>
    </section>
  )
}
