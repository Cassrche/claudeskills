import { readFileSync } from 'node:fs'

export const EVIDENCE_POLICY_PATH = 'scripts/validate/evidence-policy.json'

export interface EvidenceCategoryPolicy {
  requiredSourceTypeGroups?: string[][]
  requiredSourceRoleGroups?: string[][]
  requireGoogleOrSpecForSearchClaims?: boolean
  requireStructuredSupportSource?: boolean
}

export interface EvidencePolicy {
  minimumSourceCount: number
  minimumDistinctRoles: number
  minimumPrimarySourceCount: number
  primaryTypes: string[]
  primaryDomains: string[]
  structuredSupportTypes: string[]
  categoryPolicies: Record<string, EvidenceCategoryPolicy>
}

interface EvidencePolicyFile {
  minimumSourceCount?: number
  minimumDistinctRoles?: number
  minimumPrimarySourceCount?: number
  primaryTypes?: string[]
  primaryDomains?: string[]
  structuredSupportTypes?: string[]
  categoryPolicies?: Record<string, EvidenceCategoryPolicy>
}

const DEFAULT_POLICY: EvidencePolicy = {
  minimumSourceCount: 2,
  minimumDistinctRoles: 2,
  minimumPrimarySourceCount: 1,
  primaryTypes: ['wcag', 'spec', 'owasp', 'google', 'mdn', 'documentation', 'web.dev'],
  primaryDomains: [
    'w3.org',
    'developer.mozilla.org',
    'developers.google.com',
    'googleusercontent.com',
    'developer.chrome.com',
    'google.com',
    'web.dev',
    'owasp.org',
    'developer.apple.com',
    'm3.material.io'
  ],
  structuredSupportTypes: ['spec', 'mdn', 'documentation'],
  categoryPolicies: {
    accessibility: {
      requiredSourceRoleGroups: [['standard'], ['reference', 'implementation']]
    },
    security: {
      requiredSourceRoleGroups: [
        ['regulation', 'standard', 'search', 'reference'],
        ['reference', 'implementation']
      ]
    },
    privacy: {
      requiredSourceRoleGroups: [
        ['regulation', 'standard', 'search', 'reference'],
        ['reference', 'implementation']
      ]
    },
    seo: {
      requireGoogleOrSpecForSearchClaims: true
    },
    css: {
      requireStructuredSupportSource: true
    },
    html: {
      requireStructuredSupportSource: true
    },
    javascript: {
      requireStructuredSupportSource: true
    }
  }
}

function isEvidencePolicyFile(value: unknown): value is EvidencePolicyFile {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>

  return (
    (record.minimumSourceCount === undefined || typeof record.minimumSourceCount === 'number') &&
    (record.minimumDistinctRoles === undefined ||
      typeof record.minimumDistinctRoles === 'number') &&
    (record.minimumPrimarySourceCount === undefined ||
      typeof record.minimumPrimarySourceCount === 'number') &&
    (record.primaryTypes === undefined ||
      (Array.isArray(record.primaryTypes) &&
        record.primaryTypes.every(item => typeof item === 'string'))) &&
    (record.primaryDomains === undefined ||
      (Array.isArray(record.primaryDomains) &&
        record.primaryDomains.every(item => typeof item === 'string'))) &&
    (record.structuredSupportTypes === undefined ||
      (Array.isArray(record.structuredSupportTypes) &&
        record.structuredSupportTypes.every(item => typeof item === 'string')))
  )
}

/**
 * Load evidence validation policy from disk.
 *
 * @param filePath - Absolute path to the JSON policy file.
 * @returns Effective policy with defaults applied.
 */
export function loadEvidencePolicy(filePath: string): EvidencePolicy {
  try {
    const raw = readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw)
    if (!isEvidencePolicyFile(parsed)) {
      throw new Error('Invalid evidence policy file')
    }

    return {
      minimumSourceCount: parsed.minimumSourceCount ?? DEFAULT_POLICY.minimumSourceCount,
      minimumDistinctRoles: parsed.minimumDistinctRoles ?? DEFAULT_POLICY.minimumDistinctRoles,
      minimumPrimarySourceCount:
        parsed.minimumPrimarySourceCount ?? DEFAULT_POLICY.minimumPrimarySourceCount,
      primaryTypes: parsed.primaryTypes ?? DEFAULT_POLICY.primaryTypes,
      primaryDomains: parsed.primaryDomains ?? DEFAULT_POLICY.primaryDomains,
      structuredSupportTypes:
        parsed.structuredSupportTypes ?? DEFAULT_POLICY.structuredSupportTypes,
      categoryPolicies: parsed.categoryPolicies ?? DEFAULT_POLICY.categoryPolicies
    }
  } catch {
    return DEFAULT_POLICY
  }
}

/**
 * Check whether a rule's source types satisfy a policy group.
 *
 * @param sourceTypes - Distinct normalized types on the rule.
 * @param group - Allowed source types for a policy slot.
 * @returns True when at least one source type matches the slot.
 */
export function matchesSourceTypeGroup(sourceTypes: Set<string>, group: string[]): boolean {
  return group.some(type => sourceTypes.has(type.toLowerCase()))
}
