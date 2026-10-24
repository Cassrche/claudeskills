import type { Sponsor, SponsorTier } from '@repo/types'
import { getFetchTimeoutOptions, shouldFetchRemoteData } from './remote-data'

// Open Collective GraphQL API endpoint
const OC_GRAPHQL_URL = 'https://api.opencollective.com/graphql/v2'

// Open Collective slug for the project
const OC_COLLECTIVE_SLUG = process.env.OPEN_COLLECTIVE_SLUG || 'front-end-checklist'

// GraphQL query to fetch members/backers from Open Collective
// API may expose collective(slug) or account(slug); we try collective first
const MEMBERS_QUERY = `
  query GetCollectiveMembers($slug: String!) {
    collective(slug: $slug) {
      members(role: BACKER, limit: 100) {
        totalCount
        nodes {
          id
          account {
            id
            slug
            name
            imageUrl
            website
            ... on Individual {
              email
            }
            ... on Organization {
              website
            }
          }
          totalDonations {
            value
            currency
          }
          createdAt
        }
      }
    }
  }
`

const MEMBERS_QUERY_ACCOUNT = `
  query GetAccountMembers($slug: String!) {
    account(slug: $slug) {
      ... on Collective {
        members(role: BACKER, limit: 100) {
          totalCount
          nodes {
            id
            account {
              id
              slug
              name
              imageUrl
              website
            }
            totalDonations {
              value
              currency
            }
            createdAt
          }
        }
      }
    }
  }
`

// Map donation amount to tier
/**
 * getTierFromAmount function.
 * @param amountInCents - amountInCents.
 */
function getTierFromAmount(amountInCents: number): SponsorTier {
  const monthlyAmount = amountInCents / 100

  if (monthlyAmount >= 2000) {
    return {
      id: 'diamond',
      name: 'Diamond',
      level: 'diamond',
      monthlyPriceInDollars: monthlyAmount,
      description: 'Diamond sponsor',
      benefits: []
    }
  }
  if (monthlyAmount >= 500) {
    return {
      id: 'gold',
      name: 'Gold',
      level: 'gold',
      monthlyPriceInDollars: monthlyAmount,
      description: 'Gold sponsor',
      benefits: []
    }
  }
  if (monthlyAmount >= 200) {
    return {
      id: 'silver',
      name: 'Silver',
      level: 'silver',
      monthlyPriceInDollars: monthlyAmount,
      description: 'Silver sponsor',
      benefits: []
    }
  }
  if (monthlyAmount >= 100) {
    return {
      id: 'bronze',
      name: 'Bronze',
      level: 'bronze',
      monthlyPriceInDollars: monthlyAmount,
      description: 'Bronze sponsor',
      benefits: []
    }
  }
  return {
    id: 'backer',
    name: 'Backer',
    level: 'backer',
    monthlyPriceInDollars: monthlyAmount,
    description: 'Backer',
    benefits: []
  }
}

export interface OpenCollectiveSponsor extends Sponsor {
  source: 'opencollective'
  totalDonations: number // Total amount donated in dollars
}

// Fetch sponsors from Open Collective API
/**
 * fetchOpenCollectiveSponsors function.
 */
export async function fetchOpenCollectiveSponsors(): Promise<OpenCollectiveSponsor[]> {
  if (!shouldFetchRemoteData()) {
    return []
  }

  try {
    const response = await fetch(OC_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: MEMBERS_QUERY,
        variables: {
          slug: OC_COLLECTIVE_SLUG
        }
      }),
      ...getFetchTimeoutOptions()
    })

    if (!response.ok) {
      throw new Error(`Open Collective API error: ${response.status}`)
    }

    const data = await response.json()

    let members = data.data?.collective?.members?.nodes ?? []

    // Fallback: when collective(slug) returns nothing, try account(slug) (some API versions use it)
    if (members.length === 0 && !data.data?.collective) {
      const accountResponse = await fetch(OC_GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: MEMBERS_QUERY_ACCOUNT,
          variables: { slug: OC_COLLECTIVE_SLUG }
        }),
        ...getFetchTimeoutOptions()
      })
      if (accountResponse.ok) {
        const accountData = await accountResponse.json()
        const account = accountData.data?.account
        members = account?.members?.nodes ?? []
      }
    }

    const sponsors: OpenCollectiveSponsor[] = members
      .filter((member: { account?: unknown }) => member.account)
      .map(
        (member: {
          account: {
            slug: string
            name: string | null
            imageUrl: string
            website?: string
          }
          totalDonations?: { value: number; currency?: string } | null
          createdAt: string
        }) => {
          // API may return value in cents or dollars; treat values < 1000 as cents for backward compat
          const rawValue = member.totalDonations?.value ?? 0
          const totalDonations = rawValue > 0 && rawValue < 1000 ? rawValue / 100 : rawValue
          return {
            login: member.account.slug,
            name: member.account.name,
            avatarUrl: member.account.imageUrl,
            websiteUrl: member.account.website,
            tier: getTierFromAmount(totalDonations * 100), // getTierFromAmount expects cents
            createdAt: member.createdAt,
            source: 'opencollective' as const,
            totalDonations
          }
        }
      )

    return sponsors
  } catch {
    return []
  }
}

// Get Open Collective URL
/**
 * getOpenCollectiveUrl function.
 * @param slug - slug.
 */
export function getOpenCollectiveUrl(slug: string = OC_COLLECTIVE_SLUG): string {
  return `https://opencollective.com/${slug}`
}
