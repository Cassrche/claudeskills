import { BarChart2, Bell, CheckCircle2, Sparkles, Users } from '@repo/design-system/icons'
import { Badge } from '@repo/design-system/ui/badge'
import { WaitlistForm } from './waitlist-form'

const UPCOMING_FEATURES = [
  {
    icon: Users,
    title: 'Team Workspaces',
    description: 'Share progress and collaborate with your team'
  },
  {
    icon: BarChart2,
    title: 'Analytics Dashboard',
    description: 'Track completion trends and identify patterns'
  },
  {
    icon: Bell,
    title: 'Smart Reminders',
    description: 'Get notified about incomplete critical items'
  }
]

/**
 * ProTeaser function.
 */
export function ProTeaser() {
  return (
    <section aria-labelledby="pro-teaser-heading" className="py-16 sm:py-20 lg:py-24">
      <div className="container-content">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-linear-to-br from-accent/5 via-background to-accent/10 p-8 sm:p-12">
          {/* Decorative gradient blur */}
          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />

          <div className="relative">
            {/* Header */}
            <div className="mb-4 flex items-center gap-3">
              <Badge variant="medium" className="gap-1.5">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                Coming Soon
              </Badge>
            </div>

            <h2
              id="pro-teaser-heading"
              className="max-w-lg font-heading font-semibold text-3xl text-foreground"
            >
              Pro features for teams and power users
            </h2>

            <p className="mt-4 max-w-xl text-foreground-muted leading-relaxed">
              The checklist will always be free. We're building additional tools for teams and
              professionals who want to take their workflow to the next level.
            </p>

            {/* Upcoming Features */}
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {UPCOMING_FEATURES.map(feature => (
                <div key={feature.title} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                    <feature.icon className="h-4 w-4 text-accent" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground text-sm">{feature.title}</h3>
                    <p className="mt-0.5 text-foreground-muted text-xs">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
              <WaitlistForm />
              <span className="flex items-center gap-1.5 text-foreground-muted text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                Free forever for individuals
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
