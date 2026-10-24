import { routeGuides, routeRules } from '@repo/config'
import { BookOpen, ChevronRight, Rocket } from '@repo/design-system/icons'
import { Button } from '@repo/design-system/ui/button'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'

/**
 * BottomCTA function.
 */
export function BottomCTA() {
  return (
    <section
      aria-labelledby="bottom-cta-heading"
      className="relative overflow-hidden py-16 sm:py-20 lg:py-24"
    >
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-accent/5 via-background to-pink-500/5" />

      {/* Decorative elements */}
      <div className="absolute top-1/2 left-1/4 h-64 w-64 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl" />
      <div className="absolute top-1/2 right-1/4 h-48 w-48 -translate-y-1/2 rounded-full bg-pink-500/10 blur-3xl" />

      <div className="container-content relative">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-2 inline-flex items-center gap-2">
            <Rocket className="h-5 w-5 text-accent" />
            <span className="font-medium text-accent text-sm uppercase tracking-wider">
              Get Started
            </span>
          </div>

          <h2
            id="bottom-cta-heading"
            className="font-bold font-heading text-4xl text-foreground leading-tight"
          >
            Ready to improve your
            <br />
            <span className="bg-linear-to-r from-accent via-purple-500 to-pink-500 bg-clip-text text-transparent">
              front-end quality
            </span>
            ?
          </h2>

          <p className="mt-4 text-foreground-muted text-lg leading-relaxed">
            Start with the critical rules that have the biggest impact, or explore all rules at your
            own pace.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="gap-2 shadow-accent/25 shadow-lg transition-shadow hover:shadow-accent/30 hover:shadow-xl"
            >
              <TrackedLink
                href={`${routeRules()}?priority=critical`}
                telemetryEvent={TELEMETRY_EVENTS.ctaClicked}
                telemetryProperties={{
                  label: 'start_critical_rules',
                  location: 'homepage_bottom_cta'
                }}
              >
                <Rocket className="h-4 w-4" />
                Start with Critical Rules
                <ChevronRight className="h-4 w-4" />
              </TrackedLink>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <TrackedLink
                href={routeGuides()}
                telemetryEvent={TELEMETRY_EVENTS.ctaClicked}
                telemetryProperties={{
                  label: 'browse_guides',
                  location: 'homepage_bottom_cta'
                }}
              >
                <BookOpen className="h-4 w-4" />
                Browse Guides
              </TrackedLink>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
