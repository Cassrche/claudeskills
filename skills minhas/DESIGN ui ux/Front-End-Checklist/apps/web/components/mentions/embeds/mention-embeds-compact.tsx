'use client'

import { FileText, Play } from '@repo/design-system/icons'
import { Card, CardContent } from '@repo/design-system/ui/card'
import type { ArticleMention, TweetMention, YouTubeMention } from '@repo/types'
import { cn } from '@repo/utils'
import { TweetMentionCard } from './x-mention-card'

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
]

/**
 * Format large metrics for compact social preview cards.
 * @param num - Numeric metric value.
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`
  }
  return String(num)
}

/**
 * Format ISO dates for compact article cards.
 * @param dateString - ISO date string to format.
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return `${SHORT_MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`
}

interface TweetEmbedProps {
  mention: TweetMention
}

/**
 * Render a compact tweet embed for homepage previews.
 * Uses cached X metadata so cards render without depending on X at runtime.
 */
export function TweetEmbedCompact({ mention }: TweetEmbedProps) {
  return (
    <div className="group tweet-embed-compact relative h-full">
      <Card className="h-full overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-border-focus hover:shadow-md">
        <CardContent className="h-full p-0">
          <TweetMentionCard compact mention={mention} />
        </CardContent>
      </Card>
    </div>
  )
}

interface YouTubeEmbedCardProps {
  mention: YouTubeMention
}

/**
 * Render a compact YouTube preview card for homepage modules.
 *
 * @param props - YouTube mention props.
 */
export function YouTubeEmbedCompact({ mention }: YouTubeEmbedCardProps) {
  const thumbnailUrl =
    mention.thumbnail || `https://img.youtube.com/vi/${mention.videoId}/maxresdefault.jpg`

  return (
    <div className="group relative">
      <Card className="overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-border-focus hover:shadow-md">
        <div className="relative aspect-video bg-muted">
          <img
            src={thumbnailUrl}
            alt={mention.title}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30">
            <div className="flex size-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg">
              <Play className="ml-1 size-6" fill="currentColor" />
            </div>
          </div>
        </div>
        <CardContent className="p-4">
          <p className="mb-1 text-foreground-muted text-xs">{mention.channel}</p>
          <h3 className="line-clamp-2 font-medium text-foreground text-sm transition-colors group-hover:text-accent">
            <a
              href={mention.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'after:absolute after:inset-0 after:content-[""]',
                'focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring'
              )}
            >
              {mention.title}
            </a>
          </h3>
          {mention.views && (
            <p className="mt-2 text-foreground-muted text-xs">
              {formatNumber(mention.views)} views
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface ArticleEmbedProps {
  mention: ArticleMention
}

/**
 * Render a compact article preview card for homepage layouts.
 *
 * @param props - Article mention props.
 */
export function ArticleEmbedCompact({ mention }: ArticleEmbedProps) {
  const title = mention.title || mention.source

  return (
    <div className="group relative h-full">
      <Card className="h-full transition-all duration-300 hover:-translate-y-0.5 hover:border-border-focus hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
              {mention.favicon ? (
                <img
                  src={mention.favicon}
                  alt=""
                  width={20}
                  height={20}
                  className="rounded"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <FileText className="size-5 text-blue-500" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-foreground-muted text-xs">{mention.source}</p>
              <h3 className="line-clamp-2 font-medium text-foreground text-sm transition-colors group-hover:text-accent">
                <a
                  href={mention.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'after:absolute after:inset-0 after:content-[""]',
                    'focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring'
                  )}
                >
                  {title}
                </a>
              </h3>
              {mention.excerpt && (
                <p className="mt-2 line-clamp-2 text-foreground-muted text-xs">{mention.excerpt}</p>
              )}
              <p className="mt-2 text-foreground-muted text-xs">{formatDate(mention.date)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
