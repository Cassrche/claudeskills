import { XBrandIcon } from '@repo/design-system/brand-icons'
import type { TweetMention } from '@repo/types'
import { cn } from '@repo/utils'
import type { ReactNode } from 'react'

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
 * Format ISO dates for compact X cards.
 * @param dateString - ISO date string to format.
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return `${SHORT_MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`
}

/**
 * Extract the X handle from a status URL when fallback metadata is unavailable.
 * @param url - X status URL from the mention dataset.
 */
function getPostHandle(url: string): string | null {
  const match = /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([^/?#]+)\/status\//u.exec(url)
  return match?.[1] ?? null
}

/** Trim sentence punctuation that should sit outside an autolink. */
function splitTrailingPunctuation(value: string): { token: string; suffix: string } {
  const match = /^(.*?)([.,!?;:)\]]*)$/u.exec(value)
  return {
    token: match?.[1] ?? value,
    suffix: match?.[2] ?? ''
  }
}

/** Resolve an X text token to a destination URL. */
function getXTokenHref(token: string, postUrl: string): string {
  if (token.startsWith('http')) {
    return token
  }

  if (token.startsWith('@')) {
    return `https://x.com/${token.slice(1)}`
  }

  if (token.startsWith('#')) {
    return `https://x.com/hashtag/${encodeURIComponent(token.slice(1))}`
  }

  return postUrl
}

/** Turn URLs, handles, and hashtags in cached X text into links. */
function renderXText(text: string, postUrl: string): ReactNode[] {
  const pattern =
    /(https?:\/\/[^\s]+|pic\.(?:twitter|x)\.com\/[A-Za-z0-9_]+|@[A-Za-z0-9_]+|#[A-Za-z0-9_]+)/gu
  const parts: ReactNode[] = []
  let lastIndex = 0

  for (const match of text.matchAll(pattern)) {
    const rawToken = match[0]
    const index = match.index ?? 0

    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index))
    }

    const { token, suffix } = splitTrailingPunctuation(rawToken)

    parts.push(
      <a
        key={`${index}-${token}`}
        href={getXTokenHref(token, postUrl)}
        target="_blank"
        rel="noopener noreferrer"
        className="relative z-10 font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {token}
      </a>
    )

    if (suffix) {
      parts.push(suffix)
    }

    lastIndex = index + rawToken.length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}

interface TweetMentionCardProps {
  mention: TweetMention
  compact?: boolean
}

/**
 * Render a static X mention card from cached build-time metadata.
 * @param props - Tweet mention and layout options.
 */
export function TweetMentionCard({ mention, compact = false }: TweetMentionCardProps) {
  const handle = mention.handle ?? getPostHandle(mention.url)
  const author = mention.author ?? (handle ? `@${handle}` : 'X mention')
  const authorUrl = mention.authorUrl ?? (handle ? `https://x.com/${handle}` : mention.url)

  return (
    <div
      className={cn(
        'relative flex min-h-[180px] flex-col justify-between bg-background p-4',
        compact ? 'h-full' : 'rounded-lg border border-border p-5'
      )}
    >
      <div>
        <div className="mb-4 flex items-start justify-between gap-3">
          <a
            href={authorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'relative z-10 flex min-w-0 items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'focus-visible:ring-offset-2'
            )}
          >
            {mention.avatarUrl ? (
              <img
                src={mention.avatarUrl}
                alt=""
                width={40}
                height={40}
                className="size-10 shrink-0 rounded-full bg-muted object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                <XBrandIcon className="size-4 text-foreground-muted" />
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate font-semibold text-foreground text-sm">{author}</span>
              {handle && (
                <span className="block truncate text-foreground-muted text-xs">@{handle}</span>
              )}
            </span>
          </a>
          <XBrandIcon className="mt-0.5 size-4 shrink-0 text-foreground" />
        </div>
        <p
          className={cn(
            'whitespace-pre-line text-foreground text-sm leading-6',
            compact && 'line-clamp-6'
          )}
        >
          {renderXText(mention.content ?? 'This mention is available on X.', mention.url)}
        </p>
        {mention.mediaUrl && (
          <div
            className={cn(
              'mt-4 overflow-hidden rounded-md border border-border bg-muted',
              compact ? 'max-h-44' : 'max-h-80'
            )}
          >
            <img
              src={mention.mediaUrl}
              alt={mention.mediaAlt ?? ''}
              className="h-auto w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
        )}
      </div>
      <div className="mt-5 flex items-center justify-between gap-3 text-foreground-muted text-xs">
        <a
          href={mention.url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-10 shrink-0 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {formatDate(mention.date)}
        </a>
        <a
          href={mention.url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-10 shrink-0 font-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          View on X
        </a>
      </div>
    </div>
  )
}
