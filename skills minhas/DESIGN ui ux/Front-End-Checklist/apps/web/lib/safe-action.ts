import 'server-only'

import { auth } from '@repo/auth/auth'
import { headers } from 'next/headers'
import { createSafeActionClient, DEFAULT_SERVER_ERROR_MESSAGE } from 'next-safe-action'
import { z } from 'zod'
import { captureServerException } from '@/lib/telemetry-server'

const actionMetadataSchema = z.object({
  actionName: z.string()
})

/**
 * Shared base safe action client for the web app.
 */
export const actionClient = createSafeActionClient({
  defaultValidationErrorsShape: 'flattened',
  defineMetadataSchema() {
    return actionMetadataSchema
  },
  handleServerError(error, utils) {
    const normalizedError = error instanceof Error ? error : new Error(DEFAULT_SERVER_ERROR_MESSAGE)
    const context = utils.ctx as { userId?: string }

    captureServerException(normalizedError, {
      route: `/actions/${utils.metadata.actionName}`,
      userId: context.userId ?? null
    })

    return normalizedError.message || DEFAULT_SERVER_ERROR_MESSAGE
  }
})

/**
 * Safe action client for authenticated actions.
 */
export const authActionClient = actionClient.use(async ({ next }) => {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  return next({
    ctx: {
      session,
      userId: session.user.id
    }
  })
})
