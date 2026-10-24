'use server'

import { z } from 'zod'
import { authActionClient } from '@/lib/safe-action'
import { updateProfileForUser } from '@/lib/server/profile-service'
import {
  isValidSocialProfileInput,
  normalizeOptionalSocialProfileUrl,
  type SocialLinkPlatform
} from '@/lib/social-links'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'
import { trackServerEvent } from '@/lib/telemetry-server'

/**
 * Build a social profile schema that accepts either shorthand usernames or canonical URLs.
 *
 * @param platform - Social platform being validated.
 * @returns Optional social profile input schema.
 */
function socialProfileSchema(platform: SocialLinkPlatform) {
  return z
    .string()
    .trim()
    .refine(value => !value || isValidSocialProfileInput(platform, value), {
      message: `Enter a valid ${platform} profile`
    })
    .optional()
}

const updateProfileSchema = z.object({
  headline: z.string().trim().max(160).optional(),
  bio: z.string().trim().max(500).optional(),
  githubUrl: socialProfileSchema('github'),
  xUrl: socialProfileSchema('x'),
  linkedinUrl: socialProfileSchema('linkedin'),
  isProfilePublic: z.boolean().optional(),
  showProgress: z.boolean().optional(),
  showChecklists: z.boolean().optional()
})

/**
 * Update the current signed-in user's editable profile fields.
 */
export const updateProfileAction = authActionClient
  .metadata({ actionName: 'update-profile' })
  .inputSchema(updateProfileSchema)
  .action(async ({ parsedInput, ctx }) => {
    const profile = await updateProfileForUser(ctx.userId, {
      headline: parsedInput.headline?.trim() || null,
      bio: parsedInput.bio?.trim() || null,
      githubUrl: normalizeOptionalSocialProfileUrl('github', parsedInput.githubUrl),
      xUrl: normalizeOptionalSocialProfileUrl('x', parsedInput.xUrl),
      linkedinUrl: normalizeOptionalSocialProfileUrl('linkedin', parsedInput.linkedinUrl),
      isProfilePublic: parsedInput.isProfilePublic,
      showProgress: parsedInput.showProgress,
      showChecklists: parsedInput.showChecklists
    })

    if (!profile) {
      throw new Error('Profile not found')
    }

    trackServerEvent(TELEMETRY_EVENTS.profileUpdated, {
      updatedFields: Object.keys(parsedInput),
      userId: ctx.userId
    })

    return profile
  })
