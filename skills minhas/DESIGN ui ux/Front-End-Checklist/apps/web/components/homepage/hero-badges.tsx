'use client'

import { SiGithub, SiVercel } from '@icons-pack/react-simple-icons'
import { GITHUB_REPO_URL, routeMcp, SKILLS_SH_URL } from '@repo/config'
import { Server } from '@repo/design-system/icons'
import { cn } from '@repo/utils'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { formatGitHubStars } from '@/lib/github'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'
import { trackInteraction } from '@/lib/telemetry-interactions'

const badgeBase = cn(
  'inline-flex items-center gap-2 rounded-full',
  'border border-border bg-background-subtle',
  'px-4 py-2 font-medium text-foreground text-sm',
  'transition-colors duration-150',
  'hover:border-border-subtle hover:bg-background-muted',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
)

interface HeroBadgesProps {
  githubStars: number | null
  className?: string
}

/**
 * Hero badge links (GitHub, Skills.sh, MCP Server).
 */
export function HeroBadges({ githubStars, className }: HeroBadgesProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      <a
        href={GITHUB_REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={badgeBase}
        aria-label={`GitHub repository with ${formatGitHubStars(githubStars, '')} stars`}
        onClick={() =>
          trackInteraction(TELEMETRY_EVENTS.externalCtaClicked, {
            label: 'github_badge',
            location: 'homepage_hero',
            target: GITHUB_REPO_URL
          })
        }
      >
        <SiGithub size={16} aria-hidden="true" />
        <span>GitHub</span>
        {githubStars !== null && (
          <span className="inline-flex items-center gap-1 text-foreground-muted">
            <span aria-hidden="true">&middot;</span>
            <span>{formatGitHubStars(githubStars, '')}</span>
          </span>
        )}
      </a>

      <a
        href={SKILLS_SH_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={badgeBase}
        aria-label="View on Skills.sh"
        onClick={() =>
          trackInteraction(TELEMETRY_EVENTS.externalCtaClicked, {
            label: 'skills_sh_badge',
            location: 'homepage_hero',
            target: SKILLS_SH_URL
          })
        }
      >
        <SiVercel size={16} aria-hidden="true" />
        <span>Skills.sh</span>
      </a>

      <TrackedLink
        href={routeMcp()}
        telemetryEvent={TELEMETRY_EVENTS.ctaClicked}
        telemetryProperties={{
          label: 'mcp_badge',
          location: 'homepage_hero'
        }}
        className={badgeBase}
      >
        <Server className="h-4 w-4" aria-hidden="true" />
        <span>MCP Server</span>
      </TrackedLink>
    </div>
  )
}
