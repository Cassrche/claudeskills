import { PrismaPg } from '@prisma/adapter-pg'
import type { Prisma } from '@prisma/client'
import { PrismaClient } from '@prisma/client'

declare global {
  var __repoAuthPrisma__: PrismaClient | undefined
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL
})

export const prisma =
  globalThis.__repoAuthPrisma__ ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
  })

if (process.env.NODE_ENV !== 'production') {
  globalThis.__repoAuthPrisma__ = prisma
}

export type { Prisma }
