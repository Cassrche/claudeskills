'use client'

import { YouTubeEmbed } from '@next/third-parties/google'
import { FileText } from '@repo/design-system/icons'
import { Card, CardContent } from '@repo/design-system/ui/card'
import type { ArticleMention, TweetMention, YouTubeMention } from '@repo/types'
import { cn } from '@repo/utils'
import { TweetMentionCard } from './x-mention-card'

export {
  ArticleEmbedCompact,
  TweetEmbedCompact,
  YouTubeEmbedCompact
} from './mention-embeds-compact'

/**
 * Format compact social metrics for embed cards.
 * @param num - Numeric metric value to format.
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

// =============================================================================
// X MENTION EMBED - Uses cached build-time metadata for stable rendering
// =============================================================================

interface TweetEmbedProps {
  mention: TweetMention
}

/**
 * TweetEmbed function.
 * @param { mention } - { mention }.
 */
export function TweetEmbed({ mention }: TweetEmbedProps) {
  return (
    <div className="tweet-embed">
      <TweetMentionCard mention={mention} />
    </div>
  )
}

// =============================================================================
// YOUTUBE EMBED - Uses @next/third-parties for lite embed
// =============================================================================

interface YouTubeEmbedCardProps {
  mention: YouTubeMention
}

/**
 * YouTubeEmbedCard function.
 * @param { mention } - { mention }.
 */
export function YouTubeEmbedCard({ mention }: YouTubeEmbedCardProps) {
  return (
    <div className="youtube-embed overflow-hidden rounded-lg border border-border">
      <YouTubeEmbed videoid={mention.videoId} params="rel=0" style="max-width: 100%;" />
      <div className="bg-background p-4">
        <p className="mb-1 text-foreground-muted text-xs">{mention.channel}</p>
        <h3 className="line-clamp-2 font-medium text-foreground text-sm">{mention.title}</h3>
        {mention.views && (
          <p className="mt-2 text-foreground-muted text-xs">{formatNumber(mention.views)} views</p>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// ARTICLE EMBED - Notion-style link preview card
// =============================================================================

interface ArticleEmbedProps {
  mention: ArticleMention
}

/**
 * ArticleEmbed function.
 * @param { mention } - { mention }.
 */
export function ArticleEmbed({ mention }: ArticleEmbedProps) {
  const title = mention.title || mention.source

  return (
    <div className="group relative">
      <Card className="overflow-hidden transition-all duration-300 hover:border-border-focus hover:shadow-md">
        <div className="flex flex-col sm:flex-row">
          {/* Content */}
          <CardContent className="flex-1 p-4 sm:p-5">
            <div className="mb-2 flex items-center gap-2">
              {mention.favicon ? (
                <img src={mention.favicon} alt="" width={16} height={16} className="rounded" />
              ) : (
                <FileText className="size-4 text-foreground-muted" />
              )}
              <span className="truncate text-foreground-muted text-xs">{mention.source}</span>
            </div>
            <h3 className="line-clamp-2 font-medium text-base text-foreground transition-colors group-hover:text-accent">
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
              <p className="mt-2 line-clamp-2 text-foreground-muted text-sm">{mention.excerpt}</p>
            )}
            {mention.author && (
              <p className="mt-2 text-foreground-muted text-xs">by {mention.author}</p>
            )}
          </CardContent>

          {/* OG Image */}
          {mention.ogImage && (
            <div className="relative h-32 w-full shrink-0 overflow-hidden sm:h-auto sm:w-48">
              <img src={mention.ogImage} alt="" className="h-full w-full object-cover" />
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
