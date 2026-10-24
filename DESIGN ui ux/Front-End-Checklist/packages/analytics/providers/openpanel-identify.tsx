'use client'

import { authClient } from '@repo/auth/auth-client'
import { useEffect } from 'react'

/**
 * Syncs the authenticated user to OpenPanel's user identification.
 */
export function OpenPanelIdentify() {
  const { data: session } = authClient.useSession()
  const user = session?.user ?? null

  useEffect(() => {
    if (typeof window === 'undefined' || !window.op) return
    if (process.env.NODE_ENV !== 'production') return

    if (user) {
      window.op.identify({
        profileId: user.id,
        properties: {
          name: user.name ?? undefined,
          email: user.email ?? undefined
        }
      })
    } else {
      window.op.clear()
    }
  }, [user])

  return null
}
