'use client'

import { routeMentions } from '@repo/config'
import { ChevronRight, MessageCircle } from '@repo/design-system/icons'
import { Button } from '@repo/design-system/ui/button'
import type { Mention } from '@repo/types'
import { m, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { useReducedMotionPreference } from '@/hooks/use-reduced-motion-preference'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'
import { MentionsMarquee, StaticMentionsGrid } from './mentions-marquee'
import { shuffleArray, splitIntoColumns } from './mentions-marquee-utils'

const MARQUEE_COLUMN_COUNT = 3
const MARQUEE_DURATIONS = [300, 260, 320] // seconds per full cycle (~5 min), slow readable scroll

interface MentionsSectionProps {
  mentions: Mention[]
}

/**
 * Community Love / mentions section with optional marquee and entrance animation.
 */
export function MentionsSection({ mentions }: MentionsSectionProps) {
  const hasMentions = mentions.length > 0
  const prefersReducedMotion = useReducedMotionPreference()
  const contentRef = useRef<HTMLDivElement>(null)
  const contentInView = useInView(contentRef, { amount: 0.1, once: true })
  const [pausedColumn, setPausedColumn] = useState<number | null>(null)

  if (!hasMentions) {
    return null
  }

  const displayMentions = shuffleArray(mentions)
  const columns = splitIntoColumns(displayMentions, MARQUEE_COLUMN_COUNT)
  const useMarquee = !prefersReducedMotion && displayMentions.length >= MARQUEE_COLUMN_COUNT

  return (
    <section
      aria-labelledby="mentions-heading"
      className="relative overflow-hidden py-16 sm:py-20 lg:py-24"
    >
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-accent/3 via-transparent to-pink-500/2" />
      <div className="absolute top-20 -left-20 h-40 w-40 rounded-full bg-accent/5 blur-3xl" />
      <div className="absolute -right-20 bottom-20 h-60 w-60 rounded-full bg-pink-500/5 blur-3xl" />

      <div className="container-content relative">
        {/* Section Header with entrance */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-pink-500" />
              <span className="font-medium text-pink-500 text-sm uppercase tracking-wider">
                Community Love
              </span>
            </div>
            <h2 id="mentions-heading" className="font-semibold text-3xl text-foreground">
              What developers are saying
            </h2>
            <p className="mt-2 text-foreground-muted">
              Trusted by thousands of developers worldwide
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="hidden gap-1.5 sm:flex">
            <TrackedLink
              href={routeMentions()}
              telemetryEvent={TELEMETRY_EVENTS.ctaClicked}
              telemetryProperties={{
                label: 'view_all_mentions',
                location: 'homepage_mentions_section'
              }}
            >
              View all mentions
              <ChevronRight className="h-4 w-4" />
            </TrackedLink>
          </Button>
        </div>

        {/* Content: marquee or static grid */}
        <div ref={contentRef} className="relative">
          {useMarquee ? (
            <>
              {/* Gradient fades */}
              <div
                className="pointer-events-none absolute top-0 right-0 left-0 z-10 h-12 bg-linear-to-b from-background to-transparent"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute right-0 bottom-0 left-0 z-10 h-12 bg-linear-to-t from-background to-transparent"
                aria-hidden
              />

              <MentionsMarquee
                columns={columns}
                durations={MARQUEE_DURATIONS}
                inView={contentInView}
                pausedColumn={pausedColumn}
                onPauseColumn={setPausedColumn}
                onResumeColumn={() => setPausedColumn(null)}
              />
            </>
          ) : (
            <m.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={
                prefersReducedMotion || contentInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }
              }
              transition={{
                duration: 0.4,
                delay: 0.1,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
            >
              <StaticMentionsGrid mentions={displayMentions} />
            </m.div>
          )}
        </div>

        {/* Mobile CTA */}
        <div className="mt-8 text-center sm:hidden">
          <Button variant="outline" asChild className="gap-1.5">
            <TrackedLink
              href={routeMentions()}
              telemetryEvent={TELEMETRY_EVENTS.ctaClicked}
              telemetryProperties={{
                label: 'view_all_mentions_mobile',
                location: 'homepage_mentions_section'
              }}
            >
              View all mentions
              <ChevronRight className="h-4 w-4" />
            </TrackedLink>
          </Button>
        </div>
      </div>
    </section>
  )
}
