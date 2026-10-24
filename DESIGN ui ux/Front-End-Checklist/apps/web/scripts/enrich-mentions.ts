#!/usr/bin/env tsx

/**
 * Enrich Mentions Script
 *
 * Reads from mentions-input.json (your edits) and generates mentions.json (app reads this).
 * Run with: pnpm enrich-mentions
 *
 * MINIMAL INPUT (mentions-input.json) - You only need:
 * - type: "tweet" | "youtube" | "article"
 * - url: the URL
 * - featured: true/false (for homepage display)
 *
 * The script auto-generates/fetches:
 * - id (from URL hash)
 * - date (from content or current date)
 * - All other metadata (title, channel, ogImage, etc.)
 *
 * OUTPUT: mentions.json (do not edit directly)
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchXPostMetadata } from './x-metadata'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const INPUT_PATH = path.join(__dirname, '../data/mentions-input.json')
const OUTPUT_PATH = path.join(__dirname, '../data/mentions.json')

interface MinimalMention {
  id?: string
  type: 'article' | 'tweet' | 'youtube'
  url: string
  date?: string
  featured?: boolean // defaults to false
}

interface EnrichedArticle {
  id: string
  type: 'article'
  url: string
  date: string
  featured: boolean
  title: string
  source: string
  author?: string
  excerpt?: string
  ogImage?: string
  favicon?: string
}

interface EnrichedTweet {
  id: string
  type: 'tweet'
  url: string
  date: string
  featured: boolean
  tweetId: string
  author?: string
  authorUrl?: string
  avatarUrl?: string
  handle?: string
  content?: string
  mediaUrl?: string
  mediaAlt?: string
  likes?: number
}

interface EnrichedYouTube {
  id: string
  type: 'youtube'
  url: string
  date: string
  featured: boolean
  videoId: string
  title: string
  channel: string
  views?: number
}

type Mention = EnrichedArticle | EnrichedTweet | EnrichedYouTube

// =============================================================================
// HELPERS
// =============================================================================

/** Generates a short deterministic ID from a URL via MD5 hashing. */
function generateId(url: string): string {
  // Create a short hash from the URL
  return crypto.createHash('md5').update(url).digest('hex').substring(0, 8)
}

/** Returns today's date as an ISO date string (YYYY-MM-DD). */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

// =============================================================================
// URL PARSERS
// =============================================================================

/** Extracts the numeric post ID from an X URL. */
function extractTweetId(url: string): string | null {
  const patterns = [/twitter\.com\/\w+\/status\/(\d+)/, /x\.com\/\w+\/status\/(\d+)/]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

/** Extracts the video ID from various YouTube URL formats. */
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
    /youtube\.com\/v\/([^?]+)/
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

/** Extracts the bare domain (without www) from a URL. */
function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname
    return hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

// =============================================================================
// METADATA FETCHERS
// =============================================================================

/** Fetches title and channel name for a YouTube video via oEmbed. */
async function fetchYouTubeMetadata(videoId: string): Promise<{
  title: string
  channel: string
  uploadDate?: string
} | null> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    const response = await fetch(oembedUrl)
    if (!response.ok) return null
    const data = await response.json()
    return {
      title: data.title || '',
      channel: data.author_name || ''
      // oEmbed doesn't provide upload date, would need YouTube Data API
    }
  } catch {
    console.error(`  Failed to fetch YouTube metadata for ${videoId}`)
    return null
  }
}

/** Fetches Open Graph and meta-tag metadata for an article URL. */
async function fetchArticleMetadata(url: string): Promise<{
  title: string
  source: string
  author?: string
  excerpt?: string
  ogImage?: string
  favicon?: string
  publishedDate?: string
} | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FrontEndChecklist/1.0)'
      }
    })
    if (!response.ok) return null
    const html = await response.text()

    const getMetaContent = (property: string): string | undefined => {
      const patterns = [
        new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`, 'i'),
        new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${property}["']`, 'i')
      ]
      for (const pattern of patterns) {
        const match = html.match(pattern)
        if (match) return match[1]
      }
      return undefined
    }

    // Extract title
    const ogTitle = getMetaContent('og:title')
    const twitterTitle = getMetaContent('twitter:title')
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = ogTitle || twitterTitle || titleMatch?.[1] || ''

    // Extract description
    const excerpt =
      getMetaContent('og:description') ||
      getMetaContent('twitter:description') ||
      getMetaContent('description')

    // Extract OG image
    const ogImage = getMetaContent('og:image') || getMetaContent('twitter:image')

    // Extract site name
    const source = getMetaContent('og:site_name') || extractDomain(url)

    // Extract author
    const author = getMetaContent('author') || getMetaContent('article:author')

    // Extract published date
    const publishedDate =
      getMetaContent('article:published_time') ||
      getMetaContent('og:article:published_time') ||
      getMetaContent('datePublished') ||
      getMetaContent('date')

    // Favicon
    const domain = new URL(url).origin
    const favicon = `${domain}/favicon.ico`

    return {
      title: title.trim(),
      source,
      author,
      excerpt: excerpt?.trim(),
      ogImage,
      favicon,
      publishedDate: publishedDate?.split('T')[0] // Extract just the date part
    }
  } catch {
    console.error(`  Failed to fetch article metadata for ${url}`)
    return null
  }
}

// =============================================================================
// ENRICHMENT LOGIC
// =============================================================================

/** Enriches a minimal mention input with fetched metadata based on its type. */
async function enrichMention(mention: MinimalMention): Promise<Mention> {
  console.log(`Enriching: ${mention.url}`)

  // Auto-generate ID if missing
  const id = mention.id || generateId(mention.url)
  // Default featured to false
  const featured = mention.featured ?? false

  switch (mention.type) {
    case 'tweet': {
      const tweetId = extractTweetId(mention.url)
      if (!tweetId) {
        console.warn(`  Could not extract tweet ID from ${mention.url}`)
      }

      const metadata = tweetId ? await fetchXPostMetadata(mention.url, tweetId) : null
      const date = mention.date || metadata?.publishedDate || getTodayDate()

      return {
        id,
        type: 'tweet',
        url: mention.url,
        date,
        featured,
        tweetId: tweetId || '',
        author: metadata?.author,
        authorUrl: metadata?.authorUrl,
        avatarUrl: metadata?.avatarUrl,
        handle: metadata?.handle,
        content: metadata?.content,
        mediaUrl: metadata?.mediaUrl,
        mediaAlt: metadata?.mediaAlt,
        likes: metadata?.likes
      }
    }

    case 'youtube': {
      const videoId = extractYouTubeVideoId(mention.url)
      if (!videoId) {
        console.warn(`  Could not extract video ID from ${mention.url}`)
      }

      const metadata = videoId ? await fetchYouTubeMetadata(videoId) : null
      const date = mention.date || metadata?.uploadDate || getTodayDate()

      return {
        id,
        type: 'youtube',
        url: mention.url,
        date,
        featured,
        videoId: videoId || '',
        title: metadata?.title || '',
        channel: metadata?.channel || ''
      }
    }

    case 'article': {
      const metadata = await fetchArticleMetadata(mention.url)
      const date = mention.date || metadata?.publishedDate || getTodayDate()

      return {
        id,
        type: 'article',
        url: mention.url,
        date,
        featured,
        title: metadata?.title || '',
        source: metadata?.source || extractDomain(mention.url),
        author: metadata?.author,
        excerpt: metadata?.excerpt,
        ogImage: metadata?.ogImage,
        favicon: metadata?.favicon
      }
    }

    default:
      return mention as Mention
  }
}

// =============================================================================
// MAIN
// =============================================================================

/** Reads mentions-input.json, enriches each entry, and writes mentions.json. */
async function main() {
  console.log('📝 Enriching mentions...')
  console.log(`   Input:  mentions-input.json`)
  console.log(`   Output: mentions.json\n`)

  // Read input file
  const inputFile = fs.readFileSync(INPUT_PATH, 'utf-8')
  const data = JSON.parse(inputFile) as { mentions: MinimalMention[] }

  // Load existing output to preserve manually-added data
  let existingData: Record<string, Mention> = {}
  if (fs.existsSync(OUTPUT_PATH)) {
    const outputFile = fs.readFileSync(OUTPUT_PATH, 'utf-8')
    const parsed = JSON.parse(outputFile) as { mentions: Mention[] }
    existingData = Object.fromEntries(parsed.mentions.map(m => [m.url, m]))
  }

  const enrichedMentions: Mention[] = []

  for (const mention of data.mentions) {
    // Check if we already have enriched data for this URL
    const existing = existingData[mention.url]
    const hasEnrichedData =
      existing?.id &&
      existing.date &&
      ((existing.type === 'tweet' &&
        existing.tweetId &&
        existing.author &&
        existing.authorUrl &&
        existing.avatarUrl &&
        existing.handle &&
        existing.content) ||
        (existing.type === 'youtube' && existing.videoId && existing.title) ||
        (existing.type === 'article' && existing.source))

    if (hasEnrichedData) {
      console.log(`Using cached: ${mention.url}`)
      // Preserve existing data but update featured flag from input (default false)
      enrichedMentions.push({ ...existing, featured: mention.featured ?? false })
    } else {
      const enriched = await enrichMention(mention)
      enrichedMentions.push(enriched)
    }
  }

  // Sort by date (newest first)
  enrichedMentions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const output = {
    _generated: "DO NOT EDIT - Generated from mentions-input.json via 'pnpm enrich-mentions'",
    mentions: enrichedMentions
  }
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`)

  console.log(`\n✅ Done! Generated mentions.json with ${enrichedMentions.length} entries.`)
}

main().catch(console.error)
