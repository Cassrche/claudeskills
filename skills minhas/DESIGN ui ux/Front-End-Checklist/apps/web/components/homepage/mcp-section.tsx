import { MCP_SERVER_URL, routeMcp } from '@repo/config'
import { InlineCode } from '@repo/design-system/custom/content/code-surface'
import { Bot, ChevronRight, Code2, Search, Terminal } from '@repo/design-system/icons'
import { Badge } from '@repo/design-system/ui/badge'
import { Button } from '@repo/design-system/ui/button'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'

const MCP_FEATURES = [
  {
    icon: Code2,
    title: 'Proactive Code Review',
    description: 'Analyze code against the same trusted rule corpus automatically'
  },
  {
    icon: Search,
    title: 'Smart Search',
    description: 'Find relevant rules by category or keyword'
  },
  {
    icon: Terminal,
    title: 'Quick References',
    description: 'Generate checklists for CI/CD pipelines'
  }
]

/**
 * McpSection function.
 */
export function McpSection() {
  return (
    <section aria-labelledby="mcp-section-heading" className="py-16 sm:py-20 lg:py-24">
      <div className="container-content">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-linear-to-br from-accent/5 via-background to-accent/10 p-8 sm:p-12">
          {/* Decorative gradient blur */}
          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />

          <div className="relative">
            {/* Header */}
            <div className="mb-4 flex items-center gap-3">
              <Badge variant="secondary" className="gap-1.5">
                <Bot className="h-3 w-3" aria-hidden="true" />
                AI Integration
              </Badge>
            </div>

            <h2
              id="mcp-section-heading"
              className="max-w-lg font-heading font-semibold text-3xl text-foreground"
            >
              Bring the checklist into your AI workflow
            </h2>

            <p className="mt-4 max-w-xl text-foreground-muted leading-relaxed">
              Use the Model Context Protocol (MCP) to integrate Front-End Checklist with Claude,
              Cursor, and other AI tools. Review code, fetch rules, run focused workflows, and keep
              your assistants grounded in the same standards your team uses on the site.
            </p>

            {/* Features */}
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {MCP_FEATURES.map(feature => (
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

            {/* Server URL */}
            <div className="mt-6 inline-block">
              <InlineCode className="break-all">{MCP_SERVER_URL}</InlineCode>
            </div>

            {/* CTA */}
            <div className="mt-6 flex items-center gap-4">
              <Button asChild>
                <TrackedLink
                  href={routeMcp()}
                  telemetryEvent={TELEMETRY_EVENTS.ctaClicked}
                  telemetryProperties={{
                    label: 'setup_instructions',
                    location: 'homepage_mcp_section'
                  }}
                >
                  Setup Instructions
                  <ChevronRight className="ml-1 h-4 w-4" />
                </TrackedLink>
              </Button>
              <span className="text-foreground-muted text-sm">
                Works with Claude, Cursor, and more
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
