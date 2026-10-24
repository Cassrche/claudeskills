import 'server-only'

import { prisma } from '@repo/auth/prisma'
import {
  buildGithubProfileImport,
  type GithubProfileImport,
  normalizeGithubUsername
} from '@repo/auth/profile'

export type GithubProfileSyncErrorCode =
  | 'missing_github_account'
  | 'missing_github_token'
  | 'github_fetch_failed'
  | 'github_profile_invalid'

/** Error raised when an explicit GitHub profile sync cannot complete. */
export class GithubProfileSyncError extends Error {
  readonly code: GithubProfileSyncErrorCode

  /**
   * Create a user-safe GitHub sync error.
   *
   * @param code - Stable error code returned to the API layer.
   * @param message - User-safe explanation.
   */
  constructor(code: GithubProfileSyncErrorCode, message: string) {
    super(message)
    this.name = 'GithubProfileSyncError'
    this.code = code
  }
}

/**
 * Fetch the verified GitHub profile for a linked OAuth account.
 *
 * @param userId - Signed-in user identifier.
 * @returns Normalized GitHub profile fields, or an empty object on failure.
 */
export async function fetchAuthenticatedGithubProfileImport(
  userId: string
): Promise<GithubProfileImport> {
  if (typeof fetch !== 'function') {
    return {}
  }

  const account = await prisma.account.findFirst({
    where: {
      userId,
      providerId: 'github',
      accessToken: { not: null }
    },
    select: { accessToken: true }
  })

  if (!account?.accessToken) {
    return {}
  }

  const response = await fetch('https://api.github.com/user', {
    headers: buildGithubHeaders(account.accessToken)
  })

  if (!response.ok) {
    return {}
  }

  return buildGithubProfileImport(await response.json())
}

/**
 * Fetch the verified GitHub profile for a linked OAuth account and surface sync failures.
 *
 * @param userId - Signed-in user identifier.
 * @returns Normalized GitHub profile fields.
 */
export async function fetchAuthenticatedGithubProfileImportStrict(
  userId: string
): Promise<GithubProfileImport> {
  if (typeof fetch !== 'function') {
    throw new GithubProfileSyncError('github_fetch_failed', 'GitHub sync is unavailable.')
  }

  const account = await prisma.account.findFirst({
    where: {
      userId,
      providerId: 'github'
    },
    select: { accessToken: true }
  })

  if (!account) {
    throw new GithubProfileSyncError(
      'missing_github_account',
      'Connect your GitHub account before syncing.'
    )
  }

  if (!account.accessToken) {
    throw new GithubProfileSyncError(
      'missing_github_token',
      'Sign in with GitHub again before syncing.'
    )
  }

  const response = await fetch('https://api.github.com/user', {
    headers: buildGithubHeaders(account.accessToken)
  })

  if (!response.ok) {
    throw new GithubProfileSyncError('github_fetch_failed', 'GitHub did not return a profile.')
  }

  const imported = buildGithubProfileImport(await response.json())
  if (!imported.githubUsername) {
    throw new GithubProfileSyncError(
      'github_profile_invalid',
      'GitHub did not return a usable username.'
    )
  }

  return imported
}

/**
 * Fetch public GitHub profile data for a username and normalize it for storage.
 *
 * @param githubUsername - GitHub username associated with the user.
 * @returns Normalized GitHub profile fields, or an empty object on failure.
 */
export async function fetchPublicGithubProfileImport(
  githubUsername: string
): Promise<GithubProfileImport> {
  const username = normalizeGithubUsername(githubUsername)
  if (!username || typeof fetch !== 'function') {
    return {}
  }

  const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
    headers: buildGithubHeaders()
  })

  if (!response.ok) {
    return {}
  }

  return buildGithubProfileImport(await response.json())
}

/**
 * Build shared GitHub REST headers.
 *
 * @param accessToken - Optional OAuth token for authenticated user requests.
 * @returns Headers accepted by GitHub's REST API.
 */
function buildGithubHeaders(accessToken?: string): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    'User-Agent': 'Front-End-Checklist',
    'X-GitHub-Api-Version': '2022-11-28'
  }
}
