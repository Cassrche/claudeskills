/** Shared section-level presentational components for the MCP landing page. */
import { ExternalLink, type Terminal } from '@repo/design-system/icons'
import type { ReactNode } from 'react'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'

interface SectionHeadingProps {
  icon: typeof Terminal
  id: string
  title: string
}

/** Render a shared section heading block used throughout the MCP landing page. */
export function SectionHeading({ icon: Icon, id, title }: SectionHeadingProps) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <div className="rounded-md bg-background-subtle p-2">
        <Icon className="h-5 w-5 text-accent" aria-hidden="true" />
      </div>
      <h2 id={id} className="font-medium text-3xl text-foreground">
        {title}
      </h2>
    </div>
  )
}

/** Render a single MCP use-case card. Static content only — not clickable. */
export function UseCaseCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="cursor-default rounded-lg border border-border bg-background-subtle p-4">
      <h3 className="mb-1 font-medium text-foreground text-sm">{title}</h3>
      <p className="text-[13px] text-foreground-muted">{description}</p>
    </div>
  )
}

/** Render a security bullet item with emphasized label text. */
export function SecurityListItem({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
      <span className="text-foreground-muted text-sm">
        <strong className="text-foreground">{title}</strong> - {children}
      </span>
    </li>
  )
}

/** Render an external CTA link used in the MCP footer section. */
export function ExternalLinkCard({
  href,
  label,
  children
}: {
  href: string
  label: string
  children: ReactNode
}) {
  return (
    <TrackedLink
      href={href}
      telemetryEvent={TELEMETRY_EVENTS.externalCtaClicked}
      telemetryProperties={{
        label,
        location: 'mcp_footer',
        target: href
      }}
      className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 font-medium text-foreground text-sm transition-colors hover:bg-background-subtle"
    >
      {children}
      <ExternalLink className="h-4 w-4" />
    </TrackedLink>
  )
}
