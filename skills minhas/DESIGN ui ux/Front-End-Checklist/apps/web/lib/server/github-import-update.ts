import 'server-only'

import type { GithubProfileImport } from '@repo/auth/profile'

interface GithubImportUserRow {
  bio: string | null
  githubBlog: string | null
  githubCompany: string | null
  githubCreatedAt: Date | null
  githubFollowers: number | null
  githubFollowing: number | null
  githubLocation: string | null
  githubProfileImportedAt: Date | null
  githubPublicGists: number | null
  githubPublicRepos: number | null
  githubUpdatedAt: Date | null
  githubUrl: string | null
  githubUsername: string | null
  xUrl: string | null
}

/**
 * Build a Prisma update that fills editable fields only when they are empty.
 *
 * @param user - Existing user row.
 * @param imported - Normalized public GitHub profile fields.
 * @param options - Controls whether GitHub-owned fields should be refreshed.
 * @returns Database update for the import.
 */
export function buildGithubImportUpdate(
  user: GithubImportUserRow,
  imported: GithubProfileImport,
  options: { refreshGithubOwnedFields: boolean }
): GithubProfileImport {
  const data: GithubProfileImport = {}

  if (imported.githubUsername) data.githubUsername = imported.githubUsername
  if (imported.githubProfileImportedAt) {
    data.githubProfileImportedAt = imported.githubProfileImportedAt
  }

  if (!user.bio && imported.bio) data.bio = imported.bio
  if (!user.xUrl && imported.xUrl) data.xUrl = imported.xUrl

  if ((options.refreshGithubOwnedFields || !user.githubUrl) && imported.githubUrl) {
    data.githubUrl = imported.githubUrl
  }
  if (imported.githubCompany) data.githubCompany = imported.githubCompany
  if (imported.githubBlog) data.githubBlog = imported.githubBlog
  if (imported.githubLocation) data.githubLocation = imported.githubLocation
  if (typeof imported.githubPublicRepos === 'number') {
    data.githubPublicRepos = imported.githubPublicRepos
  }
  if (typeof imported.githubPublicGists === 'number') {
    data.githubPublicGists = imported.githubPublicGists
  }
  if (typeof imported.githubFollowers === 'number') data.githubFollowers = imported.githubFollowers
  if (typeof imported.githubFollowing === 'number') data.githubFollowing = imported.githubFollowing
  if (imported.githubCreatedAt) data.githubCreatedAt = imported.githubCreatedAt
  if (imported.githubUpdatedAt) data.githubUpdatedAt = imported.githubUpdatedAt

  return data
}

/**
 * Reflect imported editable fields in the in-memory row before serialization.
 *
 * @param user - Mutable profile user row.
 * @param data - GitHub import update applied to the database.
 */
export function applyGithubImportToUser(
  user: GithubImportUserRow,
  data: GithubProfileImport
): void {
  if (data.githubUsername) user.githubUsername = data.githubUsername
  if (data.bio) user.bio = data.bio
  if (data.githubUrl) user.githubUrl = data.githubUrl
  if (data.xUrl) user.xUrl = data.xUrl
  if (data.githubCompany) user.githubCompany = data.githubCompany
  if (data.githubBlog) user.githubBlog = data.githubBlog
  if (data.githubLocation) user.githubLocation = data.githubLocation
  if (typeof data.githubPublicRepos === 'number') user.githubPublicRepos = data.githubPublicRepos
  if (typeof data.githubPublicGists === 'number') user.githubPublicGists = data.githubPublicGists
  if (typeof data.githubFollowers === 'number') user.githubFollowers = data.githubFollowers
  if (typeof data.githubFollowing === 'number') user.githubFollowing = data.githubFollowing
  if (data.githubCreatedAt) user.githubCreatedAt = data.githubCreatedAt
  if (data.githubUpdatedAt) user.githubUpdatedAt = data.githubUpdatedAt
  if (data.githubProfileImportedAt) user.githubProfileImportedAt = data.githubProfileImportedAt
}
