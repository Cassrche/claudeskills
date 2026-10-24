import 'server-only'

import type { Sponsor, SponsorsData, SponsorTier } from '@repo/types'
import { cacheLife, cacheTag } from 'next/cache'
import sponsorsFallbackData from '@/data/sponsors-fallback.json'
import { fetchGitHubSponsors, getGitHubSponsorsUrl } from './github-sponsors'
import { fetchOpenCollectiveSponsors, getOpenCollectiveUrl } from './open-collective'

export interface UnifiedSponsorsData extends SponsorsData {
  githubSponsorsUrl: string
  openCollectiveUrl: string
}

const DEFAULT_TIER: SponsorTier = {
  id: 'backer',
  name: 'Backer',
  level: 'backer',
  monthlyPriceInDollars: 10,
  description: 'Backer',
  benefits: []
}

/**
 * Returns static fallback sponsor list when live APIs return no data.
 * @returns Normalized fallback sponsor list.
 */
function getFallbackSponsors(): Sponsor[] {
  const raw = sponsorsFallbackData as {
    sponsors?: Array<{
      login: string
      name?: string | null
      avatarUrl: string
      websiteUrl?: string
    }>
  }
  const list = raw?.sponsors ?? []
  return list
    .filter((s): s is typeof s & { login: string; avatarUrl: string } =>
      Boolean(s?.login && s?.avatarUrl)
    )
    .map(s => ({
      login: s.login,
      name: s.name ?? null,
      avatarUrl: s.avatarUrl,
      websiteUrl: s.websiteUrl,
      tier: DEFAULT_TIER,
      createdAt: new Date(0).toISOString(),
      totalDonations: 10
    }))
}

/**
 * Build sponsor fallback response data.
 * @returns Unified sponsor data from static fallback records.
 */
function getFallbackSponsorsData(): UnifiedSponsorsData {
  const fallbackSponsors = getFallbackSponsors()

  return {
    tiers: [DEFAULT_TIER],
    sponsors: fallbackSponsors,
    totalCount: fallbackSponsors.length,
    monthlyRevenue: fallbackSponsors.reduce(
      (sum, sponsor) => sum + (sponsor.totalDonations || 0),
      0
    ),
    githubSponsorsUrl: getGitHubSponsorsUrl(),
    openCollectiveUrl: getOpenCollectiveUrl()
  }
}

/**
 * Fetch and combine sponsors from both GitHub Sponsors and Open Collective.
 * Deduplicates by login/slug and falls back to static sponsor data when APIs return no sponsors.
 */
export async function fetchAllSponsors(): Promise<UnifiedSponsorsData> {
  'use cache'
  cacheTag('homepage-sponsors')
  cacheLife({ revalidate: 3600, expire: 31_536_000 })

  let githubData: SponsorsData
  let ocSponsors: Sponsor[]

  try {
    const sponsorResults = await Promise.all([fetchGitHubSponsors(), fetchOpenCollectiveSponsors()])
    githubData = sponsorResults[0]
    ocSponsors = sponsorResults[1]
  } catch {
    return getFallbackSponsorsData()
  }

  const githubSponsors: Sponsor[] = githubData.sponsors.map(sponsor => ({
    ...sponsor,
    source: 'github' as const,
    totalDonations: sponsor.tier.monthlyPriceInDollars || 10
  }))

  const sponsorMap = new Map<string, Sponsor>()

  for (const sponsor of githubSponsors) {
    sponsorMap.set(sponsor.login.toLowerCase(), sponsor)
  }

  for (const sponsor of ocSponsors) {
    const key = sponsor.login.toLowerCase()
    const existing = sponsorMap.get(key)

    if (existing) {
      sponsorMap.set(key, {
        ...existing,
        totalDonations: (existing.totalDonations || 0) + (sponsor.totalDonations || 0),
        name: existing.name || sponsor.name,
        websiteUrl: existing.websiteUrl || sponsor.websiteUrl
      })
    } else {
      sponsorMap.set(key, sponsor)
    }
  }

  const allSponsors = Array.from(sponsorMap.values()).sort(
    (a, b) => (b.totalDonations || 0) - (a.totalDonations || 0)
  )

  if (allSponsors.length === 0) {
    return {
      ...getFallbackSponsorsData(),
      tiers: githubData.tiers
    }
  }

  return {
    tiers: githubData.tiers,
    sponsors: allSponsors,
    totalCount: allSponsors.length,
    monthlyRevenue: allSponsors.reduce((sum, sponsor) => sum + (sponsor.totalDonations || 0), 0),
    githubSponsorsUrl: getGitHubSponsorsUrl(),
    openCollectiveUrl: getOpenCollectiveUrl()
  }
}
