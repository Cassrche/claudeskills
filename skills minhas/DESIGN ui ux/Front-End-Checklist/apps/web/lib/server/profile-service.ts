import 'server-only'

import { prisma } from '@repo/auth/prisma'
import { normalizeGithubUsername } from '@repo/auth/profile'
import { applyGithubImportToUser, buildGithubImportUpdate } from './github-import-update'
import {
  fetchAuthenticatedGithubProfileImport,
  fetchAuthenticatedGithubProfileImportStrict,
  fetchPublicGithubProfileImport
} from './github-profile-fetch'

export interface ProfileRecord {
  username?: string
  githubUsername?: string
  headline?: string
  bio?: string
  githubUrl?: string
  xUrl?: string
  linkedinUrl?: string
  githubCompany?: string
  githubBlog?: string
  githubLocation?: string
  githubPublicRepos?: number
  githubFollowers?: number
  githubProfileImportedAt?: string
  isProfilePublic: boolean
  showProgress: boolean
  showChecklists: boolean
}

export interface ProfileUpdateInput {
  headline?: string | null
  bio?: string | null
  githubUrl?: string | null
  xUrl?: string | null
  linkedinUrl?: string | null
  isProfilePublic?: boolean
  showProgress?: boolean
  showChecklists?: boolean
}

interface ProfileUserRow {
  username: string | null
  githubUsername: string | null
  headline: string | null
  bio: string | null
  githubUrl: string | null
  xUrl: string | null
  linkedinUrl: string | null
  githubCompany: string | null
  githubBlog: string | null
  githubLocation: string | null
  githubPublicRepos: number | null
  githubPublicGists: number | null
  githubFollowers: number | null
  githubFollowing: number | null
  githubCreatedAt: Date | null
  githubUpdatedAt: Date | null
  githubProfileImportedAt: Date | null
  isProfilePublic: boolean
  showProgress: boolean
  showChecklists: boolean
}

const PROFILE_SELECT = {
  username: true,
  githubUsername: true,
  headline: true,
  bio: true,
  githubUrl: true,
  xUrl: true,
  linkedinUrl: true,
  githubCompany: true,
  githubBlog: true,
  githubLocation: true,
  githubPublicRepos: true,
  githubPublicGists: true,
  githubFollowers: true,
  githubFollowing: true,
  githubCreatedAt: true,
  githubUpdatedAt: true,
  githubProfileImportedAt: true,
  isProfilePublic: true,
  showProgress: true,
  showChecklists: true
} satisfies Record<keyof ProfileUserRow, true>

/**
 * Normalize a raw Prisma user record into the client-facing profile shape.
 *
 * @param user - User row selected from Prisma.
 * @returns Serialized profile record.
 */
function serializeProfile(user: ProfileUserRow): ProfileRecord {
  const resolvedGithubUrl =
    user.githubUrl ??
    (user.githubUsername ? `https://github.com/${user.githubUsername}` : undefined)

  return {
    username: user.username ?? undefined,
    githubUsername: user.githubUsername ?? undefined,
    headline: user.headline ?? undefined,
    bio: user.bio ?? undefined,
    githubUrl: resolvedGithubUrl,
    xUrl: user.xUrl ?? undefined,
    linkedinUrl: user.linkedinUrl ?? undefined,
    githubCompany: user.githubCompany ?? undefined,
    githubBlog: user.githubBlog ?? undefined,
    githubLocation: user.githubLocation ?? undefined,
    githubPublicRepos: user.githubPublicRepos ?? undefined,
    githubFollowers: user.githubFollowers ?? undefined,
    githubProfileImportedAt: user.githubProfileImportedAt?.toISOString(),
    isProfilePublic: user.isProfilePublic,
    showProgress: user.showProgress,
    showChecklists: user.showChecklists
  }
}

/**
 * Load the editable profile record for a user, backfilling the public username once when possible.
 *
 * @param userId - Signed-in user identifier.
 * @returns Profile record or null when no user row exists.
 */
export async function getProfileForUser(userId: string): Promise<ProfileRecord | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: PROFILE_SELECT
  })

  if (!user) {
    return null
  }

  await importGithubProfileOnce(userId, user)
  await backfillPublicUsername(userId, user)

  return serializeProfile(user)
}

/**
 * Backfill the public profile slug from the verified GitHub username when possible.
 *
 * @param userId - Signed-in user identifier.
 * @param user - Mutable profile user row loaded from Prisma.
 */
async function backfillPublicUsername(userId: string, user: ProfileUserRow): Promise<void> {
  const updates: { username?: string; isProfilePublic?: true } = {}

  if (!user.username && user.githubUsername) {
    const candidate = normalizeGithubUsername(user.githubUsername)
    if (candidate) {
      const taken = await prisma.user.findUnique({
        where: { username: candidate },
        select: { id: true }
      })

      if (!taken) {
        updates.username = candidate
        if (!user.isProfilePublic) {
          updates.isProfilePublic = true
        }
      }
    }
  }

  if (Object.keys(updates).length > 0) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: updates
      })

      if (updates.username) {
        user.username = updates.username
      }
      if (updates.isProfilePublic) {
        user.isProfilePublic = true
      }
    } catch (error) {
      if (updates.username && isUniqueConstraintError(error)) {
        await prisma.user.update({
          where: { id: userId },
          data: { isProfilePublic: true }
        })
        user.isProfilePublic = true
      } else {
        throw error
      }
    }
  }
}

/**
 * Detect Prisma unique-constraint failures without importing generated error classes.
 *
 * @param error - Unknown database error.
 * @returns True for Prisma P2002 errors.
 */
function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002')
}

/**
 * Backfill public GitHub metadata once for existing GitHub-connected users.
 *
 * @param userId - Signed-in user identifier.
 * @param user - Mutable profile user row loaded from Prisma.
 */
async function importGithubProfileOnce(userId: string, user: ProfileUserRow): Promise<void> {
  if (user.githubUsername && user.githubProfileImportedAt) {
    return
  }

  try {
    const imported = user.githubUsername
      ? await fetchPublicGithubProfileImport(user.githubUsername)
      : await fetchAuthenticatedGithubProfileImport(userId)

    if (!imported.githubUsername) {
      return
    }

    const data = buildGithubImportUpdate(user, imported, { refreshGithubOwnedFields: false })
    await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true }
    })

    applyGithubImportToUser(user, data)
  } catch {
    // Import is opportunistic; profile loading must not fail when GitHub is unavailable.
  }
}

/**
 * Update the editable profile fields for a user.
 *
 * @param userId - Signed-in user identifier.
 * @param updates - Normalized fields to update.
 * @returns Updated profile record or null when no user row exists.
 */
export async function updateProfileForUser(
  userId: string,
  updates: ProfileUpdateInput
): Promise<ProfileRecord | null> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: updates,
    select: PROFILE_SELECT
  })

  await importGithubProfileOnce(userId, user)
  await backfillPublicUsername(userId, user)

  return serializeProfile(user)
}

/**
 * Explicitly refresh the signed-in user's read-only GitHub profile metadata.
 *
 * @param userId - Signed-in user identifier.
 * @returns Updated profile record or null when no user row exists.
 */
export async function syncGithubProfileForUser(userId: string): Promise<ProfileRecord | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: PROFILE_SELECT
  })

  if (!user) {
    return null
  }

  const imported = await fetchAuthenticatedGithubProfileImportStrict(userId)
  const data = buildGithubImportUpdate(user, imported, { refreshGithubOwnedFields: true })

  await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true }
  })

  applyGithubImportToUser(user, data)
  await backfillPublicUsername(userId, user)

  return serializeProfile(user)
}
