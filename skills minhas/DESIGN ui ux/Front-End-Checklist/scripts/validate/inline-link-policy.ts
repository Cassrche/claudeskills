import { readFileSync } from 'node:fs'

export const INLINE_LINK_POLICY_PATH = 'scripts/validate/inline-link-policy.json'

export interface InlineLinkPolicy {
  trustedSecondaryDomains: Set<string>
  trustedSecondaryUrls: Set<string>
}

interface InlineLinkPolicyFile {
  trustedSecondaryDomains?: string[]
  trustedSecondaryUrls?: string[]
}

function normalizeDomain(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
}

function isInlineLinkPolicyFile(value: unknown): value is InlineLinkPolicyFile {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const domains = Reflect.get(value, 'trustedSecondaryDomains')
  const urls = Reflect.get(value, 'trustedSecondaryUrls')

  return (
    (domains === undefined ||
      (Array.isArray(domains) && domains.every(item => typeof item === 'string'))) &&
    (urls === undefined || (Array.isArray(urls) && urls.every(item => typeof item === 'string')))
  )
}

/**
 * Load the inline-link review policy from disk.
 *
 * @param filePath - Absolute path to the JSON policy file.
 * @returns Effective trusted-domain policy for inline links.
 */
export function loadInlineLinkPolicy(filePath: string): InlineLinkPolicy {
  try {
    const raw = readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw)

    if (!isInlineLinkPolicyFile(parsed)) {
      throw new Error('Invalid inline-link policy file')
    }

    return {
      trustedSecondaryDomains: new Set(
        (parsed.trustedSecondaryDomains ?? []).map(normalizeDomain).filter(Boolean)
      ),
      trustedSecondaryUrls: new Set(
        (parsed.trustedSecondaryUrls ?? []).map(url => url.trim()).filter(Boolean)
      )
    }
  } catch {
    return {
      trustedSecondaryDomains: new Set<string>(),
      trustedSecondaryUrls: new Set<string>()
    }
  }
}

/**
 * Check whether a URL matches the trusted-secondary policy.
 *
 * @param url - URL to classify.
 * @param policy - Effective inline-link policy.
 * @returns True when the URL is allowlisted as a trusted secondary reference.
 */
export function isTrustedSecondaryUrl(url: string, policy: InlineLinkPolicy): boolean {
  if (policy.trustedSecondaryUrls.has(url)) {
    return true
  }

  try {
    const hostname = new URL(url).hostname.toLowerCase()

    for (const domain of policy.trustedSecondaryDomains) {
      if (hostname === domain || hostname.endsWith(`.${domain}`)) {
        return true
      }
    }
  } catch {
    return false
  }

  return false
}
