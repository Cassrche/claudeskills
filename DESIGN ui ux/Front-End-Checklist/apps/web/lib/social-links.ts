export type SocialLinkPlatform = 'github' | 'x' | 'linkedin'

const GITHUB_USERNAME_REGEX = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i
const X_HANDLE_REGEX = /^[a-z\d_]{1,15}$/i
const LINKEDIN_SLUG_REGEX = /^[a-z\d][a-z\d_-]{1,98}[a-z\d]$/i

const PLATFORM_LABELS: Record<SocialLinkPlatform, string> = {
  github: 'GitHub',
  x: 'X',
  linkedin: 'LinkedIn'
}

/**
 * Error thrown when a social profile value cannot be normalized safely.
 */
export class InvalidSocialLinkError extends Error {
  constructor(platform: SocialLinkPlatform) {
    super(`Invalid ${PLATFORM_LABELS[platform]} profile`)
    this.name = 'InvalidSocialLinkError'
  }
}

/**
 * Normalize optional social profile input to the canonical URL stored by the app.
 *
 * @param platform - Social platform being normalized.
 * @param value - Raw form or API value.
 * @returns Canonical URL, or null when the input is empty.
 */
export function normalizeOptionalSocialProfileUrl(
  platform: SocialLinkPlatform,
  value: string | null | undefined
): string | null {
  const trimmed = value?.trim()
  if (!trimmed) {
    return null
  }

  return normalizeSocialProfileUrl(platform, trimmed)
}

/**
 * Check whether a non-empty social profile input can be normalized.
 *
 * @param platform - Social platform being checked.
 * @param value - Raw profile value.
 * @returns True when the value is accepted for the platform.
 */
export function isValidSocialProfileInput(platform: SocialLinkPlatform, value: string): boolean {
  try {
    normalizeSocialProfileUrl(platform, value)
    return true
  } catch {
    return false
  }
}

/**
 * Convert a stored profile URL back into the shorthand shown in the edit form.
 *
 * @param platform - Social platform being formatted.
 * @param value - Stored profile URL.
 * @returns Username-like value when recognized, otherwise the original value.
 */
export function getSocialProfileInputValue(
  platform: SocialLinkPlatform,
  value: string | null | undefined
): string {
  const trimmed = value?.trim()
  if (!trimmed) {
    return ''
  }

  const parsed = parseSocialUrl(trimmed)
  if (!parsed) {
    return trimmed
  }

  if (platform === 'github' && isGithubHost(parsed.hostname)) {
    return firstPathSegment(parsed) ?? trimmed
  }

  if (platform === 'x' && isXHost(parsed.hostname)) {
    return firstPathSegment(parsed) ?? trimmed
  }

  if (platform === 'linkedin' && isLinkedinHost(parsed.hostname)) {
    const segments = pathSegments(parsed)
    if ((segments[0] === 'in' || segments[0] === 'company') && segments[1]) {
      return segments[0] === 'in' ? segments[1] : `/${segments[0]}/${segments[1]}`
    }
  }

  return trimmed
}

/**
 * Normalize a non-empty social profile value.
 *
 * @param platform - Social platform being normalized.
 * @param value - Raw non-empty profile value.
 * @returns Canonical social profile URL.
 */
function normalizeSocialProfileUrl(platform: SocialLinkPlatform, value: string): string {
  const parsed = parseSocialUrl(value)

  if (parsed) {
    return normalizeSocialUrl(platform, parsed)
  }

  return normalizeSocialShorthand(platform, value)
}

/**
 * Normalize a parsed social profile URL for its expected platform.
 *
 * @param platform - Social platform being normalized.
 * @param url - Parsed URL candidate.
 * @returns Canonical social profile URL.
 */
function normalizeSocialUrl(platform: SocialLinkPlatform, url: URL): string {
  if (platform === 'github') {
    const username = firstPathSegment(url)
    if (!isGithubHost(url.hostname) || !username || !GITHUB_USERNAME_REGEX.test(username)) {
      throw new InvalidSocialLinkError(platform)
    }

    return `https://github.com/${username}`
  }

  if (platform === 'x') {
    const handle = firstPathSegment(url)
    if (!isXHost(url.hostname) || !handle || !X_HANDLE_REGEX.test(handle)) {
      throw new InvalidSocialLinkError(platform)
    }

    return `https://x.com/${handle}`
  }

  const segments = pathSegments(url)
  const section = segments[0]
  const slug = segments[1]
  if (
    !isLinkedinHost(url.hostname) ||
    (section !== 'in' && section !== 'company') ||
    !slug ||
    !LINKEDIN_SLUG_REGEX.test(slug)
  ) {
    throw new InvalidSocialLinkError(platform)
  }

  return `https://www.linkedin.com/${section}/${slug}`
}

/**
 * Normalize username-style input when no URL host is present.
 *
 * @param platform - Social platform being normalized.
 * @param value - Raw shorthand profile value.
 * @returns Canonical social profile URL.
 */
function normalizeSocialShorthand(platform: SocialLinkPlatform, value: string): string {
  const cleaned = value.trim().replace(/^@/, '').replace(/^\/+/, '')

  if (platform === 'github' && GITHUB_USERNAME_REGEX.test(cleaned)) {
    return `https://github.com/${cleaned}`
  }

  if (platform === 'x' && X_HANDLE_REGEX.test(cleaned)) {
    return `https://x.com/${cleaned}`
  }

  if (platform === 'linkedin') {
    const segments = cleaned.split('/').filter(Boolean)
    const slug = segments.length === 2 && segments[0] === 'in' ? segments[1] : cleaned
    if (LINKEDIN_SLUG_REGEX.test(slug)) {
      return `https://www.linkedin.com/in/${slug}`
    }
  }

  throw new InvalidSocialLinkError(platform)
}

/**
 * Parse URL-like input while leaving plain usernames as shorthand values.
 *
 * @param value - Raw profile value.
 * @returns Parsed URL for host-bearing values, otherwise null.
 */
function parseSocialUrl(value: string): URL | null {
  const normalized = value.match(/^https?:\/\//i) ? value : `https://${value}`

  try {
    const parsed = new URL(normalized)
    return parsed.hostname.includes('.') ? parsed : null
  } catch {
    return null
  }
}

/**
 * Read the first non-empty URL path segment.
 *
 * @param url - Parsed social URL.
 * @returns First path segment, when present.
 */
function firstPathSegment(url: URL): string | undefined {
  return pathSegments(url)[0]
}

/**
 * Split a URL path into non-empty segments.
 *
 * @param url - Parsed social URL.
 * @returns Path segments.
 */
function pathSegments(url: URL): string[] {
  return url.pathname.split('/').filter(Boolean)
}

/**
 * Check whether a hostname belongs to GitHub profile URLs.
 *
 * @param hostname - URL hostname.
 * @returns True for supported GitHub hosts.
 */
function isGithubHost(hostname: string): boolean {
  return hostname.toLowerCase() === 'github.com' || hostname.toLowerCase() === 'www.github.com'
}

/**
 * Check whether a hostname belongs to X profile URLs.
 *
 * @param hostname - URL hostname.
 * @returns True for supported X hosts.
 */
function isXHost(hostname: string): boolean {
  return hostname.toLowerCase() === 'x.com' || hostname.toLowerCase() === 'www.x.com'
}

/**
 * Check whether a hostname belongs to LinkedIn profile URLs.
 *
 * @param hostname - URL hostname.
 * @returns True for supported LinkedIn hosts.
 */
function isLinkedinHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase()
  return normalized === 'linkedin.com' || normalized === 'www.linkedin.com'
}
