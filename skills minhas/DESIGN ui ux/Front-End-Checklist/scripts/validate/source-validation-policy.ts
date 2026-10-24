import { readFileSync } from 'node:fs'

export const SOURCE_VALIDATION_POLICY_PATH = 'scripts/validate/validate-sources-policy.json'

export type UrlClassification = 'ok' | 'redirect' | 'dead' | 'bot_blocked' | 'timeout' | 'error'

export interface SourceValidationPolicy {
  botBlockedDomains: Set<string>
  botBlockedUrls: Set<string>
}

interface SourceValidationPolicyFile {
  botBlockedDomains?: string[]
  botBlockedUrls?: string[]
}

/**
 * Check whether parsed JSON matches the expected policy-file shape.
 *
 * @param value - Parsed JSON value.
 * @returns True when the value can be treated as a policy file.
 */
function isPolicyFile(value: unknown): value is SourceValidationPolicyFile {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const domains = Reflect.get(value, 'botBlockedDomains')
  const urls = Reflect.get(value, 'botBlockedUrls')

  return (
    (domains === undefined ||
      (Array.isArray(domains) && domains.every(item => typeof item === 'string'))) &&
    (urls === undefined || (Array.isArray(urls) && urls.every(item => typeof item === 'string')))
  )
}

export interface ClassifiedUrlResult {
  classification: UrlClassification
  note?: string
  ok: boolean
}

/**
 * Normalize domains so host matching is stable across config inputs.
 *
 * @param domain - User-provided domain or URL fragment.
 * @returns Lowercase hostname without protocol or path segments.
 */
export function normalizeDomain(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
}

/**
 * Parse CLI overrides for source validation policy.
 *
 * @param args - CLI arguments.
 * @returns Policy entries requested via the command line.
 */
export function parsePolicyArgs(args: string[]): SourceValidationPolicy {
  const botBlockedDomains = new Set<string>()
  const botBlockedUrls = new Set<string>()

  for (const arg of args) {
    if (arg.startsWith('--allow-bot-blocked-domain=')) {
      const domain = normalizeDomain(arg.slice('--allow-bot-blocked-domain='.length))
      if (domain) botBlockedDomains.add(domain)
    }

    if (arg.startsWith('--allow-bot-blocked-url=')) {
      const url = arg.slice('--allow-bot-blocked-url='.length).trim()
      if (url) botBlockedUrls.add(url)
    }
  }

  return { botBlockedDomains, botBlockedUrls }
}

/**
 * Load the JSON policy file that declares approved bot-blocked sources.
 *
 * @param filePath - Absolute path to the policy file.
 * @returns Policy loaded from disk or an empty policy when absent/invalid.
 */
export function loadPolicyFile(filePath: string): SourceValidationPolicy {
  try {
    const raw = readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw)
    if (!isPolicyFile(parsed)) {
      throw new Error('Invalid source validation policy file')
    }

    return {
      botBlockedDomains: new Set(
        (parsed.botBlockedDomains ?? []).map(normalizeDomain).filter(Boolean)
      ),
      botBlockedUrls: new Set((parsed.botBlockedUrls ?? []).map(url => url.trim()).filter(Boolean))
    }
  } catch {
    return {
      botBlockedDomains: new Set<string>(),
      botBlockedUrls: new Set<string>()
    }
  }
}

/**
 * Merge multiple policy configs into a single lookup set.
 *
 * @param configs - Policies to combine.
 * @returns A merged policy.
 */
export function mergePolicies(...configs: SourceValidationPolicy[]): SourceValidationPolicy {
  const botBlockedDomains = new Set<string>()
  const botBlockedUrls = new Set<string>()

  for (const config of configs) {
    for (const domain of config.botBlockedDomains) botBlockedDomains.add(domain)
    for (const url of config.botBlockedUrls) botBlockedUrls.add(url)
  }

  return { botBlockedDomains, botBlockedUrls }
}

/**
 * Explain why a URL is allowed to return bot-blocking responses.
 *
 * @param url - URL being validated.
 * @param policy - Effective validation policy.
 * @returns Human-readable allowance reason or null.
 */
export function getBotBlockedReason(url: string, policy: SourceValidationPolicy): string | null {
  if (policy.botBlockedUrls.has(url)) {
    return 'allowed via exact URL'
  }

  try {
    const hostname = new URL(url).hostname.toLowerCase()
    for (const allowedDomain of policy.botBlockedDomains) {
      if (hostname === allowedDomain || hostname.endsWith(`.${allowedDomain}`)) {
        return `allowed via domain (${allowedDomain})`
      }
    }
  } catch {
    return null
  }

  return null
}

/**
 * Classify an HTTP response into a validation outcome.
 *
 * @param url - URL that was fetched.
 * @param status - Final HTTP status code.
 * @param redirected - Whether the fetch followed a redirect.
 * @param policy - Effective validation policy.
 * @returns Classification, note, and whether it should count as valid.
 */
export function classifyHttpResult({
  url,
  status,
  redirected,
  policy
}: {
  url: string
  status: number
  redirected: boolean
  policy: SourceValidationPolicy
}): ClassifiedUrlResult {
  const botBlockedReason = getBotBlockedReason(url, policy)

  if ((status === 403 || status === 429) && botBlockedReason) {
    return {
      classification: 'bot_blocked',
      note: `${status} bot-blocked — ${botBlockedReason}`,
      ok: true
    }
  }

  if (status >= 200 && status < 300) {
    return {
      classification: redirected ? 'redirect' : 'ok',
      note: redirected ? 'redirected' : undefined,
      ok: true
    }
  }

  if (status >= 300 && status < 400) {
    return {
      classification: 'redirect',
      note: `redirect response (${status})`,
      ok: true
    }
  }

  return {
    classification: 'dead',
    note: `HTTP ${status}`,
    ok: false
  }
}

/**
 * Classify fetch failures that did not produce a response.
 *
 * @param error - Error thrown by fetch.
 * @returns Validation classification for the failure.
 */
export function classifyFetchError(error: Error): ClassifiedUrlResult {
  const isTimeout = error.name === 'AbortError'

  return {
    classification: isTimeout ? 'timeout' : 'error',
    note: isTimeout ? 'timed out' : error.message,
    ok: false
  }
}
