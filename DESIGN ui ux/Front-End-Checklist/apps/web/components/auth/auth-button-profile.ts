import { routePublicProfile } from '@repo/config'

export interface PublicProfileShortcutState {
  href: string | null
  userId?: string
}

/**
 * Safely read a non-empty string from an API response object.
 * @param value - Unknown response value.
 * @param key - Property name to read.
 * @returns Trimmed string when present.
 */
function readStringProperty(value: unknown, key: string): string | undefined {
  if (!(typeof value === 'object' && value)) {
    return undefined
  }

  const property = Object.getOwnPropertyDescriptor(value, key)?.value
  return typeof property === 'string' && property.trim() ? property.trim() : undefined
}

/**
 * Safely read a boolean from an API response object.
 * @param value - Unknown response value.
 * @param key - Property name to read.
 * @returns Boolean property value when present.
 */
function readBooleanProperty(value: unknown, key: string): boolean | undefined {
  if (!(typeof value === 'object' && value)) {
    return undefined
  }

  const property = Object.getOwnPropertyDescriptor(value, key)?.value
  return typeof property === 'boolean' ? property : undefined
}

/**
 * Resolve the current user's public profile route from the profile API response.
 * @param value - Unknown profile response.
 * @returns Internal public profile path when the profile is visible.
 */
function getPublicProfileHref(value: unknown): string | null {
  if (readBooleanProperty(value, 'isProfilePublic') !== true) {
    return null
  }

  const username =
    readStringProperty(value, 'username') ?? readStringProperty(value, 'githubUsername')
  return username ? routePublicProfile(username) : null
}

/**
 * Fetch the signed-in user's current public profile shortcut target.
 * @returns Internal profile href when the profile can be viewed publicly.
 */
export async function fetchPublicProfileHref(): Promise<string | null> {
  try {
    const response = await fetch('/api/profile')
    if (!response.ok) {
      return null
    }

    const profile: unknown = await response.json()
    return getPublicProfileHref(profile)
  } catch {
    return null
  }
}
