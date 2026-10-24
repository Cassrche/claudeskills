import { checkBotId } from 'botid/server'
import { NextResponse } from 'next/server'

/** Returns a 403 response if the request originates from a bot, otherwise null. */
export async function rejectIfBot() {
  const { isBot } = await checkBotId()
  if (isBot) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }
  return null
}

/**
 * Throw when the current request originates from a bot.
 */
export async function throwIfBot() {
  const { isBot } = await checkBotId()

  if (isBot) {
    throw new Error('Access denied')
  }
}
