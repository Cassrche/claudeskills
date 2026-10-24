import type { ProfileData } from './profile-types'

/**
 * Read a synced profile from an unknown API response.
 *
 * @param value - Parsed JSON returned by the GitHub sync endpoint.
 * @returns Profile data when the response has the expected shape.
 */
export function getSyncedProfile(value: unknown): ProfileData | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const profile = Object.getOwnPropertyDescriptor(value, 'profile')?.value
  return isProfileData(profile) ? profile : null
}

/**
 * Check whether an unknown value looks like profile data.
 *
 * @param value - Unknown value to validate.
 * @returns True when the required profile booleans are present.
 */
function isProfileData(value: unknown): value is ProfileData {
  if (!value || typeof value !== 'object') {
    return false
  }

  return (
    typeof Object.getOwnPropertyDescriptor(value, 'isProfilePublic')?.value === 'boolean' &&
    typeof Object.getOwnPropertyDescriptor(value, 'showProgress')?.value === 'boolean' &&
    typeof Object.getOwnPropertyDescriptor(value, 'showChecklists')?.value === 'boolean'
  )
}
