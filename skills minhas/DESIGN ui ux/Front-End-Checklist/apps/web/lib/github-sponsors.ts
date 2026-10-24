import { GITHUB_GRAPHQL_URL, GITHUB_OWNER } from '@repo/config'
import type { Sponsor, SponsorsData, SponsorTier } from '@repo/types'
import { getFetchTimeoutOptions, shouldFetchRemoteData } from './remote-data'

const GITHUB_SPONSORS_LOGIN = process.env.GITHUB_SPONSORS_LOGIN || GITHUB_OWNER

// GitHub token for API access
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

// GraphQL query to fetch public sponsorship data only
// Note: Detailed tier info and sponsor listings require additional token permissions
const SPONSORS_QUERY = `
  query GetSponsorsData($login: String!) {
    user(login: $login) {
      sponsorshipsAsMaintainer(first: 100, includePrivate: false) {
        totalCount
        nodes {
          sponsorEntity {
            ... on User {
              login
              name
              avatarUrl
              websiteUrl
            }
            ... on Organization {
              login
              name
              avatarUrl
              websiteUrl
            }
          }
          createdAt
        }
      }
    }
  }
`

// Fetch sponsors from GitHub API
/**
 * fetchGitHubSponsors function.
 */
export async function fetchGitHubSponsors(): Promise<SponsorsData> {
  if (!shouldFetchRemoteData()) {
    return {
      tiers: [],
      sponsors: [],
      totalCount: 0,
      monthlyRevenue: 0
    }
  }

  // If no token, return empty data
  if (!GITHUB_TOKEN) {
    return {
      tiers: [],
      sponsors: [],
      totalCount: 0,
      monthlyRevenue: 0
    }
  }

  try {
    const response = await fetch(GITHUB_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GITHUB_TOKEN}`
      },
      body: JSON.stringify({
        query: SPONSORS_QUERY,
        variables: {
          login: GITHUB_SPONSORS_LOGIN
        }
      }),
      ...getFetchTimeoutOptions()
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`)
    }

    const data = await response.json()

    // Log errors but continue if we have partial data
    if (data.errors) {
      console.warn('GitHub GraphQL partial errors (continuing with available data):', data.errors)
    }

    const user = data.data?.user
    if (!user) {
      throw new Error('User not found')
    }

    // Note: Detailed tier info requires additional token permissions
    // We provide a default tier for all sponsors since we can't access tier details
    const defaultTier: SponsorTier = {
      id: 'sponsor',
      name: 'Sponsor',
      level: 'backer',
      monthlyPriceInDollars: 0,
      description: 'GitHub Sponsor',
      benefits: []
    }

    // Get sponsors (without detailed tier info due to API limitations)
    const sponsorships = user.sponsorshipsAsMaintainer?.nodes || []
    const sponsors: Sponsor[] = sponsorships
      .filter((s: { sponsorEntity: unknown }) => s.sponsorEntity)
      .map(
        (sponsorship: {
          sponsorEntity: {
            login: string
            name: string | null
            avatarUrl: string
            websiteUrl?: string
          }
          createdAt: string
        }) => ({
          login: sponsorship.sponsorEntity.login,
          name: sponsorship.sponsorEntity.name,
          avatarUrl: sponsorship.sponsorEntity.avatarUrl,
          websiteUrl: sponsorship.sponsorEntity.websiteUrl,
          tier: defaultTier,
          createdAt: sponsorship.createdAt
        })
      )

    return {
      tiers: [defaultTier], // Single default tier since we can't access tier details
      sponsors,
      totalCount: user.sponsorshipsAsMaintainer?.totalCount || 0,
      monthlyRevenue: 0 // Not accessible without additional permissions
    }
  } catch {
    return {
      tiers: [],
      sponsors: [],
      totalCount: 0,
      monthlyRevenue: 0
    }
  }
}

// Get GitHub Sponsors URL for a user
/**
 * getGitHubSponsorsUrl function.
 * @param login - login.
 */
export function getGitHubSponsorsUrl(login: string = GITHUB_SPONSORS_LOGIN): string {
  return `https://github.com/sponsors/${login}`
}

// Group sponsors by their tier name
/**
 * groupSponsorsByTier function.
 * @param sponsors - sponsors.
 */
export function groupSponsorsByTier(sponsors: Sponsor[]): Record<string, Sponsor[]> {
  const grouped: Record<string, Sponsor[]> = {}

  for (const sponsor of sponsors) {
    const tierName = sponsor.tier.name
    if (!grouped[tierName]) {
      grouped[tierName] = []
    }
    grouped[tierName].push(sponsor)
  }

  return grouped
}
