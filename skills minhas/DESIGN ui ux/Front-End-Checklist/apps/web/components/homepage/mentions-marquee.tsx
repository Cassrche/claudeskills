'use client'

import type { Mention } from '@repo/types'
import { domAnimation, LazyMotion, m, useInView } from 'framer-motion'
import { memo, useRef } from 'react'
import {
  ArticleEmbedCompact,
  TweetEmbedCompact,
  YouTubeEmbedCompact
} from '@/components/mentions/embeds/mention-embeds'
import { useReducedMotionPreference } from '@/hooks/use-reduced-motion-preference'

/** Render a single mention card based on mention type. */
const MentionCard = memo(function MentionCard({ mention }: { mention: Mention }) {
  switch (mention.type) {
    case 'article':
      return <ArticleEmbedCompact mention={mention} />
    case 'tweet':
      return <TweetEmbedCompact mention={mention} />
    case 'youtube':
      return <YouTubeEmbedCompact mention={mention} />
    default:
      return null
  }
})

/** Reserve space while offscreen cards stay unmounted. */
function MentionCardPlaceholder() {
  return (
    <div
      className="min-h-[140px] shrink-0 rounded-lg border border-border bg-background-subtle"
      aria-hidden
    />
  )
}

/** Mount mention cards only when they near the viewport of their marquee column. */
function LazyMentionCard({
  mention,
  columnRef
}: {
  mention: Mention
  columnRef: React.RefObject<HTMLDivElement | null>
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const inView = useInView(cardRef, {
    root: columnRef,
    margin: '400px 0px',
    amount: 0
  })

  return (
    <div ref={cardRef} className="shrink-0 [content-visibility:auto]">
      {inView ? <MentionCard mention={mention} /> : <MentionCardPlaceholder />}
    </div>
  )
}

/** Render one animated marquee column with duplicated content for seamless looping. */
function MarqueeColumn({
  mentions,
  duration,
  isPaused,
  onPause,
  onResume,
  index,
  shouldAnimate
}: {
  mentions: Mention[]
  duration: number
  isPaused: boolean
  onPause: () => void
  onResume: () => void
  index: number
  shouldAnimate: boolean
}) {
  const columnRef = useRef<HTMLDivElement>(null)
  if (mentions.length === 0) return null

  const duplicated = [...mentions, ...mentions]

  return (
    <div
      ref={columnRef}
      className="relative h-[74vh] max-h-[680px] min-h-[320px] overflow-hidden"
      onMouseEnter={onPause}
      onMouseLeave={onResume}
      onFocus={onPause}
      onBlur={onResume}
    >
      <div
        className="flex flex-col gap-4 sm:gap-6"
        style={{
          animationName: shouldAnimate ? 'mentions-marquee' : 'none',
          animationDuration: shouldAnimate ? `${duration}s` : undefined,
          animationTimingFunction: shouldAnimate ? 'linear' : undefined,
          animationIterationCount: shouldAnimate ? 'infinite' : undefined,
          animationPlayState: isPaused ? 'paused' : 'running'
        }}
      >
        {duplicated.map((mention, mentionIndex) => (
          <LazyMentionCard
            key={`${mention.id}-${index}-${mentionIndex}`}
            mention={mention}
            columnRef={columnRef}
          />
        ))}
      </div>
    </div>
  )
}

/** Render a static multi-column fallback when reduced motion is enabled. */
export function StaticMentionsGrid({ mentions }: { mentions: Mention[] }) {
  return (
    <div className="columns-1 gap-4 sm:columns-2 sm:gap-6 lg:columns-3">
      {mentions.map(mention => (
        <div key={mention.id} className="mb-4 break-inside-avoid sm:mb-6">
          <MentionCard mention={mention} />
        </div>
      ))}
    </div>
  )
}

/** Render animated marquee columns when motion is allowed. */
export function MentionsMarquee({
  columns,
  durations,
  inView,
  pausedColumn,
  onPauseColumn,
  onResumeColumn
}: {
  columns: Mention[][]
  durations: number[]
  inView: boolean
  pausedColumn: number | null
  onPauseColumn: (index: number) => void
  onResumeColumn: () => void
}) {
  const prefersReducedMotion = useReducedMotionPreference()

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
        initial={prefersReducedMotion ? false : { opacity: 0 }}
        animate={prefersReducedMotion || inView ? { opacity: 1 } : { opacity: 0 }}
        transition={{
          duration: 0.4,
          ease: [0.25, 0.46, 0.45, 0.94],
          delay: 0.1
        }}
      >
        {columns.map((columnMentions, index) => (
          <m.div
            key={index}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            animate={prefersReducedMotion || inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{
              duration: 0.45,
              delay: 0.15 + index * 0.08,
              ease: [0.25, 0.46, 0.45, 0.94]
            }}
          >
            <MarqueeColumn
              mentions={columnMentions}
              duration={durations[index] ?? 280}
              isPaused={pausedColumn === index}
              onPause={() => onPauseColumn(index)}
              onResume={onResumeColumn}
              index={index}
              shouldAnimate={inView}
            />
          </m.div>
        ))}
      </m.div>
    </LazyMotion>
  )
}
