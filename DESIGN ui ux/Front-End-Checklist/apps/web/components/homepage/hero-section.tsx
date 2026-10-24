import { routeChecklists, routeRules } from '@repo/config'
import { ChevronRight } from '@repo/design-system/icons'
import { Button } from '@repo/design-system/ui/button'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'
import { HeroBadges } from './hero-badges'

interface HeroSectionProps {
  ruleCountLabel: string
  githubStars: number | null
}

/**
 * Homepage hero: headline, CTA buttons, and badge links.
 */
export function HeroSection({ ruleCountLabel, githubStars }: HeroSectionProps) {
  return (
    <section className="relative">
      <div className="absolute inset-0 -z-10 bg-linear-to-b from-background via-background to-background-subtle opacity-50" />

      <div className="container-content py-16 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-heading font-medium text-6xl text-foreground leading-[1.1] tracking-tight">
            Trusted front-end quality rules for humans and AI agents
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-foreground-muted text-xl leading-relaxed">
            The essential checklist for modern web development, with {ruleCountLabel} rules across
            launch, review, accessibility, performance, security, privacy, and SEO workflows. Browse
            the corpus, start with curated checklists, or connect the same standards to AI tools
            with MCP.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg">
              <TrackedLink
                href={routeChecklists()}
                telemetryEvent={TELEMETRY_EVENTS.ctaClicked}
                telemetryProperties={{
                  label: 'start_curated_checklist',
                  location: 'homepage_hero'
                }}
                className="px-6 py-2"
              >
                Start a Curated Checklist
                <ChevronRight className="ml-1 size-4" />
              </TrackedLink>
            </Button>
            <Button asChild variant="outline" size="lg">
              <TrackedLink
                href={routeRules()}
                telemetryEvent={TELEMETRY_EVENTS.ctaClicked}
                telemetryProperties={{
                  label: 'browse_all_rules',
                  location: 'homepage_hero'
                }}
                className="px-6 py-2"
              >
                Browse All Rules
              </TrackedLink>
            </Button>
          </div>

          <HeroBadges githubStars={githubStars} className="mt-6 justify-center" />
        </div>
      </div>
    </section>
  )
}
