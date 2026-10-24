'use client'

import { authClient } from '@repo/auth/auth-client'
import { trackClientEvent } from './telemetry-client'
import { TELEMETRY_EVENTS } from './telemetry-events'

type SignInResult = Awaited<ReturnType<typeof authClient.signIn.social>>
type SignOutResult = Awaited<ReturnType<typeof authClient.signOut>>

/**
 * Start the GitHub sign-in flow and emit a centralized analytics event for the attempt.
 *
 * @param callbackURL - URL the auth flow should return to after login.
 * @returns Better Auth's sign-in result.
 */
export async function startGitHubSignIn(callbackURL: string): Promise<SignInResult> {
  trackClientEvent(TELEMETRY_EVENTS.authSignInStarted, {
    callbackUrl: callbackURL,
    provider: 'github'
  })

  try {
    const result = await authClient.signIn.social({
      provider: 'github',
      callbackURL
    })

    if (result.error) {
      trackClientEvent(TELEMETRY_EVENTS.authSignInFailed, {
        callbackUrl: callbackURL,
        error: result.error.message ?? 'unknown_error',
        provider: 'github'
      })
    }

    return result
  } catch (error) {
    trackClientEvent(TELEMETRY_EVENTS.authSignInFailed, {
      callbackUrl: callbackURL,
      error: error instanceof Error ? error.message : 'unknown_error',
      provider: 'github'
    })
    throw error
  }
}

/**
 * Sign the current user out and emit a centralized analytics event for the outcome.
 *
 * @returns Better Auth's sign-out result.
 */
export async function signOutCurrentUser(): Promise<SignOutResult> {
  try {
    const result = await authClient.signOut()

    if (result.error) {
      trackClientEvent(TELEMETRY_EVENTS.authSignOutFailed, {
        error: result.error.message ?? 'unknown_error'
      })
    } else {
      trackClientEvent(TELEMETRY_EVENTS.authSignOutSucceeded)
    }

    return result
  } catch (error) {
    trackClientEvent(TELEMETRY_EVENTS.authSignOutFailed, {
      error: error instanceof Error ? error.message : 'unknown_error'
    })
    throw error
  }
}
