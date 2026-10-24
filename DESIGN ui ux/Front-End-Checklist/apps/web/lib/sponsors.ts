import type { Sponsor } from '@repo/types'

/**
 * Calculate the size of a sponsor bubble based on their donation amount
 * Returns a size in pixels for the avatar
 */
export function getSponsorBubbleSize(
  totalDonations: number,
  minSize: number = 40,
  maxSize: number = 120
): number {
  // Use logarithmic scale for more balanced sizing
  // $10 = minSize, $2000+ = maxSize
  if (totalDonations <= 0) return minSize

  const minDonation = 10
  const maxDonation = 2000

  // Clamp the donation amount
  const clampedDonation = Math.min(Math.max(totalDonations, minDonation), maxDonation)

  // Logarithmic interpolation for smoother scaling
  const logMin = Math.log(minDonation)
  const logMax = Math.log(maxDonation)
  const logValue = Math.log(clampedDonation)

  const ratio = (logValue - logMin) / (logMax - logMin)
  return Math.round(minSize + ratio * (maxSize - minSize))
}

/**
 * Get tier-based color for sponsor bubble border
 */
export function getSponsorTierColor(tier: Sponsor['tier']): string {
  switch (tier.level) {
    case 'diamond':
      return '#b9f2ff' // Light cyan/diamond
    case 'gold':
      return '#ffd700' // Gold
    case 'silver':
      return '#c0c0c0' // Silver
    case 'bronze':
      return '#cd7f32' // Bronze
    default:
      return 'transparent'
  }
}
