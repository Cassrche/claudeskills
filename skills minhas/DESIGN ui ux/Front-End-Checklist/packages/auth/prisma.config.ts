import 'dotenv/config'
import { defineConfig } from 'prisma/config'

const DATABASE_URL_FALLBACK = 'postgresql://user:password@localhost:5432/frontendchecklist'
const DATABASE_COMMANDS = new Set(['db', 'migrate', 'studio'])

/**
 * Check whether the current Prisma command needs a real database connection.
 *
 * @returns True when the Prisma command should require DATABASE_URL.
 */
function requiresDatabaseUrl() {
  return process.argv.some(argument => DATABASE_COMMANDS.has(argument))
}

/**
 * Resolve the Prisma datasource URL without making install/generate require production secrets.
 *
 * @returns A real database URL when configured, otherwise a placeholder for generation-only commands.
 */
function getDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL
  }

  if (requiresDatabaseUrl()) {
    throw new Error('DATABASE_URL is required for Prisma database commands.')
  }

  return DATABASE_URL_FALLBACK
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations'
  },
  datasource: {
    url: getDatabaseUrl()
  }
})
