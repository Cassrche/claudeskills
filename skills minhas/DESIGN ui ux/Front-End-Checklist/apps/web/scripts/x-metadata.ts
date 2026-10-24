interface XPostMetadata {
  author?: string
  authorUrl?: string
  avatarUrl?: string
  handle?: string
  content?: string
  mediaUrl?: string
  mediaAlt?: string
  publishedDate?: string
  likes?: number
}

/** Return a string property from an unknown JSON object. */
function getStringProperty(value: unknown, property: string): string | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }

  const propertyValue = Reflect.get(value, property)
  return typeof propertyValue === 'string' ? propertyValue : undefined
}

/** Return a numeric property from an unknown JSON object. */
function getNumberProperty(value: unknown, property: string): number | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }

  const propertyValue = Reflect.get(value, property)
  return typeof propertyValue === 'number' ? propertyValue : undefined
}

/** Decode the small HTML entity set returned by X oEmbed snippets. */
function decodeHtml(value: string): string {
  return value
    .replace(/&#(\d+);/gu, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/giu, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    )
    .replace(/&quot;/gu, '"')
    .replace(/&#39;/gu, "'")
    .replace(/&apos;/gu, "'")
    .replace(/&amp;/gu, '&')
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
}

/** Convert an oEmbed HTML fragment into readable post text. */
function extractPostContent(html: string): string | undefined {
  const match = /<p\b[^>]*>([\s\S]*?)<\/p>/iu.exec(html)
  if (!match) {
    return undefined
  }

  return decodeHtml(
    match[1]
      .replace(/<br\s*\/?>/giu, '\n')
      .replace(/<[^>]+>/gu, '')
      .replace(/[ \t]+\n/gu, '\n')
      .replace(/\n{3,}/gu, '\n\n')
      .trim()
  )
}

/** Extract the visible date from X's oEmbed blockquote markup. */
function extractPostDate(html: string): string | undefined {
  const anchors = Array.from(html.matchAll(/<a\b[^>]*>([^<]+)<\/a>/giu))
  const dateLabel = anchors.at(-1)?.[1]
  if (!dateLabel) {
    return undefined
  }

  const timestamp = Date.parse(decodeHtml(dateLabel))
  if (Number.isNaN(timestamp)) {
    return undefined
  }

  return new Date(timestamp).toISOString().split('T')[0]
}

/** Generate the request token expected by X's syndication endpoint. */
function generateSyndicationToken(postId: string): string {
  return ((Number(postId) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/gu, '')
}

/** Return the first object from an unknown property array. */
function getFirstObjectProperty(value: unknown, property: string): unknown {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }

  const propertyValue = Reflect.get(value, property)
  return Array.isArray(propertyValue) ? propertyValue[0] : undefined
}

/** Read an image URL from X card binding values. */
function getCardImageUrl(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }

  const card = Reflect.get(value, 'card')
  if (typeof card !== 'object' || card === null) {
    return undefined
  }

  const bindingValues = Reflect.get(card, 'binding_values')
  if (typeof bindingValues !== 'object' || bindingValues === null) {
    return undefined
  }

  const imageBinding = Reflect.get(bindingValues, 'photo_image_full_size_large')
  if (typeof imageBinding !== 'object' || imageBinding === null) {
    return undefined
  }

  const imageValue = Reflect.get(imageBinding, 'image_value')
  return getStringProperty(imageValue, 'url')
}

/** Fetch cacheable X post metadata via the official oEmbed endpoint. */
async function fetchOEmbedMetadata(url: string): Promise<XPostMetadata | null> {
  try {
    const oembedUrl = new URL('https://publish.x.com/oembed')
    oembedUrl.searchParams.set('url', url)
    oembedUrl.searchParams.set('omit_script', 'true')
    oembedUrl.searchParams.set('hide_thread', 'true')

    const response = await fetch(oembedUrl)
    if (!response.ok) return null

    const data: unknown = await response.json()
    const author = getStringProperty(data, 'author_name')
    const authorUrl = getStringProperty(data, 'author_url')
    const html = getStringProperty(data, 'html')

    if (!(author && authorUrl)) {
      return null
    }

    return {
      author,
      authorUrl,
      handle: new URL(authorUrl).pathname.replace(/^\//u, ''),
      content: html ? extractPostContent(html) : undefined,
      publishedDate: html ? extractPostDate(html) : undefined
    }
  } catch {
    console.error(`  Failed to fetch X metadata for ${url}`)
    return null
  }
}

/** Fetch richer X post metadata for cached static cards. */
async function fetchSyndicationMetadata(postId: string): Promise<XPostMetadata | null> {
  try {
    const syndicationUrl = new URL('https://cdn.syndication.twimg.com/tweet-result')
    syndicationUrl.searchParams.set('id', postId)
    syndicationUrl.searchParams.set('lang', 'en')
    syndicationUrl.searchParams.set('token', generateSyndicationToken(postId))

    const response = await fetch(syndicationUrl)
    if (!response.ok) return null

    const data: unknown = await response.json()
    if (getStringProperty(data, '__typename') !== 'Tweet') {
      return null
    }

    const user = typeof data === 'object' && data !== null ? Reflect.get(data, 'user') : undefined
    const firstPhoto = getFirstObjectProperty(data, 'photos')
    const firstMedia = getFirstObjectProperty(data, 'mediaDetails')
    const mediaUrl =
      getStringProperty(firstPhoto, 'url') ||
      getStringProperty(firstMedia, 'media_url_https') ||
      getCardImageUrl(data)
    const createdAt = getStringProperty(data, 'created_at')

    return {
      author: getStringProperty(user, 'name'),
      handle: getStringProperty(user, 'screen_name'),
      avatarUrl: getStringProperty(user, 'profile_image_url_https'),
      content: getStringProperty(data, 'text')?.replace(/&lt;/gu, '<').replace(/&gt;/gu, '>'),
      mediaUrl,
      mediaAlt: getStringProperty(firstMedia, 'ext_alt_text'),
      publishedDate: createdAt ? new Date(createdAt).toISOString().split('T')[0] : undefined,
      likes: getNumberProperty(data, 'favorite_count')
    }
  } catch {
    console.error(`  Failed to fetch X syndication metadata for ${postId}`)
    return null
  }
}

/** Fetch and merge X post metadata from stable and rich sources. */
export async function fetchXPostMetadata(url: string, postId: string): Promise<XPostMetadata> {
  const [oembedMetadata, syndicationMetadata] = await Promise.all([
    fetchOEmbedMetadata(url),
    fetchSyndicationMetadata(postId)
  ])

  return {
    author: oembedMetadata?.author || syndicationMetadata?.author,
    authorUrl: oembedMetadata?.authorUrl,
    avatarUrl: syndicationMetadata?.avatarUrl,
    handle: oembedMetadata?.handle || syndicationMetadata?.handle,
    content: oembedMetadata?.content || syndicationMetadata?.content,
    mediaUrl: syndicationMetadata?.mediaUrl,
    mediaAlt: syndicationMetadata?.mediaAlt,
    publishedDate: oembedMetadata?.publishedDate || syndicationMetadata?.publishedDate,
    likes: syndicationMetadata?.likes
  }
}
