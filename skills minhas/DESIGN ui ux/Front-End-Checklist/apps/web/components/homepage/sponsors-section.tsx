'use client'

import { ExternalLink, Heart } from '@repo/design-system/icons'
import { Button } from '@repo/design-system/ui/button'
import type { Sponsor } from '@repo/types'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'
import { trackInteraction } from '@/lib/telemetry-interactions'
import { SponsorsBubbles } from './sponsors-bubbles'

const EMPTY_SPONSORS: Sponsor[] = []

interface SponsorsSectionProps {
  sponsors?: Sponsor[]
  githubSponsorsUrl: string
  openCollectiveUrl?: string
}

/** Track a click on one of the sponsor support CTAs. */
function trackSponsorCta(label: string, target: string) {
  trackInteraction(TELEMETRY_EVENTS.externalCtaClicked, {
    label,
    location: 'homepage_sponsors_section',
    target
  })
}

/**
 * EmptyState function.
 */
function EmptyState({
  githubSponsorsUrl,
  openCollectiveUrl
}: {
  githubSponsorsUrl: string
  openCollectiveUrl?: string
}) {
  return (
    <div className="py-8 text-center">
      <div className="mb-6 flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
          <Heart className="h-8 w-8 text-accent" aria-hidden="true" />
        </div>
      </div>

      <h3 className="mb-2 font-medium text-foreground text-lg">Support Open Source</h3>

      <p className="mx-auto mb-6 max-w-md text-foreground-muted leading-relaxed">
        The Front-End Checklist is free and open source. Your sponsorship helps sustain development
        and keeps this resource available for everyone.
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <a
            href={githubSponsorsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackSponsorCta('become_a_sponsor', githubSponsorsUrl)}
          >
            <Heart className="mr-2 h-4 w-4" aria-hidden="true" />
            Become a Sponsor
            <ExternalLink className="ml-2 h-3.5 w-3.5 opacity-50" aria-hidden="true" />
          </a>
        </Button>
        {openCollectiveUrl && (
          <Button variant="outline" asChild>
            <a
              href={openCollectiveUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackSponsorCta('open_collective', openCollectiveUrl)}
            >
              Open Collective
              <ExternalLink className="ml-2 h-3.5 w-3.5 opacity-50" aria-hidden="true" />
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * SponsorsDisplay function.
 */
function SponsorsDisplay({
  sponsors,
  githubSponsorsUrl,
  openCollectiveUrl
}: {
  sponsors: Sponsor[]
  githubSponsorsUrl: string
  openCollectiveUrl?: string
}) {
  return (
    <div className="text-center">
      {/* Circular bubble visualization */}
      <SponsorsBubbles sponsors={sponsors} className="mb-10" />

      {/* Sponsor buttons */}
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <a
            href={githubSponsorsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackSponsorCta('become_a_sponsor', githubSponsorsUrl)}
          >
            <Heart className="mr-2 h-4 w-4" aria-hidden="true" />
            Become a Sponsor
            <ExternalLink className="ml-2 h-3.5 w-3.5 opacity-50" aria-hidden="true" />
          </a>
        </Button>
        {openCollectiveUrl && (
          <Button variant="outline" asChild>
            <a
              href={openCollectiveUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackSponsorCta('open_collective', openCollectiveUrl)}
            >
              Open Collective
              <ExternalLink className="ml-2 h-3.5 w-3.5 opacity-50" aria-hidden="true" />
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * SponsorsSection function.
 */
export function SponsorsSection({
  sponsors = EMPTY_SPONSORS,
  githubSponsorsUrl,
  openCollectiveUrl
}: SponsorsSectionProps) {
  const hasSponsors = sponsors.length > 0

  return (
    <section aria-labelledby="sponsors-heading" className="py-16 sm:py-20 lg:py-24">
      <div className="container-content">
        <div className="mb-10 text-center">
          <div className="mb-2 inline-flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            <span className="font-medium text-pink-500 text-sm uppercase tracking-wider">
              Sponsors
            </span>
          </div>
          <h2 id="sponsors-heading" className="font-heading font-semibold text-3xl text-foreground">
            {hasSponsors ? 'Supported by Amazing Sponsors' : 'Support Open Source'}
          </h2>
          {hasSponsors && (
            <p className="mx-auto mt-2 max-w-lg text-foreground-muted">
              Thank you to all our sponsors for supporting the Front-End Checklist project.
            </p>
          )}
        </div>

        {hasSponsors ? (
          <SponsorsDisplay
            sponsors={sponsors}
            githubSponsorsUrl={githubSponsorsUrl}
            openCollectiveUrl={openCollectiveUrl}
          />
        ) : (
          <EmptyState githubSponsorsUrl={githubSponsorsUrl} openCollectiveUrl={openCollectiveUrl} />
        )}
      </div>
    </section>
  )
}
