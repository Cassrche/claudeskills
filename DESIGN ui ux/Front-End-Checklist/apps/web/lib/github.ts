import { GITHUB_REPO_API_URL, GITHUB_REPO_URL } from '@repo/config'
import { getFetchTimeoutOptions } from './remote-data'

export const GITHUB_REPOSITORY_URL = GITHUB_REPO_URL

/**
 * fetchGitHubStars function.
 */
export async function fetchGitHubStars(): Promise<number | null> {
  try {
    const response = await fetch(GITHUB_REPO_API_URL, {
      next: { revalidate: 3600 },
      ...getFetchTimeoutOptions()
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    return typeof data.stargazers_count === 'number' && data.stargazers_count >= 0
      ? data.stargazers_count
      : null
  } catch {
    return null
  }
}

/**
 * formatGitHubStars function.
 * @param count - count.
 * @param fallback - fallback.
 */
export function formatGitHubStars(count: number | null, fallback: string) {
  if (count === null) {
    return fallback
  }

  return count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count)
}
