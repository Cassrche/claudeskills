import type { ArticleMention, Mention, TweetMention, YouTubeMention } from '@repo/types'
import mentionsData from '@/data/mentions.json'

/**
 * Check whether an unknown value includes the required base mention fields.
 * @param value - Unknown mention-like value.
 */
function isBaseMention(
  value: unknown
): value is { id: string; type: string; url: string; date: string; featured: boolean } {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  return (
    typeof Reflect.get(value, 'id') === 'string' &&
    typeof Reflect.get(value, 'type') === 'string' &&
    typeof Reflect.get(value, 'url') === 'string' &&
    typeof Reflect.get(value, 'date') === 'string' &&
    typeof Reflect.get(value, 'featured') === 'boolean'
  )
}

/**
 * Normalize a raw mention record into the discriminated Mention union.
 * @param value - Raw mention data from JSON.
 */
function normalizeMention(value: unknown): Mention | null {
  if (!isBaseMention(value)) {
    return null
  }

  if (
    Reflect.get(value, 'type') === 'article' &&
    typeof Reflect.get(value, 'title') === 'string' &&
    typeof Reflect.get(value, 'source') === 'string'
  ) {
    const mention: ArticleMention = {
      id: Reflect.get(value, 'id'),
      type: 'article',
      url: Reflect.get(value, 'url'),
      date: Reflect.get(value, 'date'),
      featured: Reflect.get(value, 'featured'),
      title: Reflect.get(value, 'title'),
      source: Reflect.get(value, 'source'),
      ...(typeof Reflect.get(value, 'author') === 'string' && {
        author: Reflect.get(value, 'author')
      }),
      ...(typeof Reflect.get(value, 'excerpt') === 'string' && {
        excerpt: Reflect.get(value, 'excerpt')
      }),
      ...(typeof Reflect.get(value, 'ogImage') === 'string' && {
        ogImage: Reflect.get(value, 'ogImage')
      }),
      ...(typeof Reflect.get(value, 'favicon') === 'string' && {
        favicon: Reflect.get(value, 'favicon')
      })
    }
    return mention
  }

  if (Reflect.get(value, 'type') === 'tweet' && typeof Reflect.get(value, 'tweetId') === 'string') {
    const mention: TweetMention = {
      id: Reflect.get(value, 'id'),
      type: 'tweet',
      url: Reflect.get(value, 'url'),
      date: Reflect.get(value, 'date'),
      featured: Reflect.get(value, 'featured'),
      tweetId: Reflect.get(value, 'tweetId'),
      ...(typeof Reflect.get(value, 'author') === 'string' && {
        author: Reflect.get(value, 'author')
      }),
      ...(typeof Reflect.get(value, 'authorUrl') === 'string' && {
        authorUrl: Reflect.get(value, 'authorUrl')
      }),
      ...(typeof Reflect.get(value, 'avatarUrl') === 'string' && {
        avatarUrl: Reflect.get(value, 'avatarUrl')
      }),
      ...(typeof Reflect.get(value, 'handle') === 'string' && {
        handle: Reflect.get(value, 'handle')
      }),
      ...(typeof Reflect.get(value, 'content') === 'string' && {
        content: Reflect.get(value, 'content')
      }),
      ...(typeof Reflect.get(value, 'mediaUrl') === 'string' && {
        mediaUrl: Reflect.get(value, 'mediaUrl')
      }),
      ...(typeof Reflect.get(value, 'mediaAlt') === 'string' && {
        mediaAlt: Reflect.get(value, 'mediaAlt')
      }),
      ...(typeof Reflect.get(value, 'likes') === 'number' && {
        likes: Reflect.get(value, 'likes')
      })
    }
    return mention
  }

  if (
    Reflect.get(value, 'type') === 'youtube' &&
    typeof Reflect.get(value, 'videoId') === 'string' &&
    typeof Reflect.get(value, 'title') === 'string' &&
    typeof Reflect.get(value, 'channel') === 'string'
  ) {
    const mention: YouTubeMention = {
      id: Reflect.get(value, 'id'),
      type: 'youtube',
      url: Reflect.get(value, 'url'),
      date: Reflect.get(value, 'date'),
      featured: Reflect.get(value, 'featured'),
      videoId: Reflect.get(value, 'videoId'),
      title: Reflect.get(value, 'title'),
      channel: Reflect.get(value, 'channel'),
      ...(typeof Reflect.get(value, 'views') === 'number' && {
        views: Reflect.get(value, 'views')
      }),
      ...(typeof Reflect.get(value, 'thumbnail') === 'string' && {
        thumbnail: Reflect.get(value, 'thumbnail')
      })
    }
    return mention
  }

  return null
}

/**
 * Return validated mention records from the static mentions dataset.
 *
 * @returns Normalized mention entries with discriminated union types.
 */
export function getMentions(): Mention[] {
  return mentionsData.mentions
    .map(normalizeMention)
    .filter((mention): mention is Mention => mention !== null)
}
