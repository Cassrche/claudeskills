import 'server-only'

import { prisma } from '@repo/auth/prisma'
import { isChecklistFramework } from '@repo/config'
import type { ChecklistFramework, UserChecklist } from '@repo/types'

export interface ChecklistCreateInput {
  name: string
  description?: string
  framework?: ChecklistFramework
  ruleIds: string[]
}

export interface ChecklistUpdateInput {
  name?: string
  description?: string | null
  framework?: ChecklistFramework | null
  color?: string | null
  ruleIds?: string[]
}

/**
 * Normalize the checklist framework value used by API routes and actions.
 *
 * @param value - Unknown input value.
 * @returns Parsed framework, null when explicitly cleared, or undefined when invalid/missing.
 */
export function parseChecklistFramework(value: unknown): ChecklistFramework | null | undefined {
  if (value === null || value === '') {
    return null
  }

  return isChecklistFramework(value) ? value : undefined
}

/**
 * Serialize a checklist row into the shared client shape.
 *
 * @param row - Prisma checklist row.
 * @returns Serialized checklist.
 */
function serializeChecklist(row: {
  id: string
  publicId: string | null
  name: string
  description: string | null
  framework: string | null
  ruleIds: string[]
  color: string | null
  createdAt: Date
  updatedAt: Date
}): UserChecklist {
  return {
    id: row.id,
    publicId: row.publicId ?? undefined,
    name: row.name,
    description: row.description ?? undefined,
    framework: row.framework && isChecklistFramework(row.framework) ? row.framework : undefined,
    ruleIds: row.ruleIds,
    color: row.color ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  }
}

/**
 * Generate a stable shareable public identifier for checklist URLs.
 *
 * @returns 12-character lowercase identifier.
 */
function generatePublicId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  const bytes = new Uint8Array(12)

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)

    for (let index = 0; index < 12; index++) {
      id += chars[bytes[index]! % chars.length]
    }

    return id
  }

  return Math.random().toString(36).slice(2, 14)
}

/**
 * List every saved checklist for a user.
 *
 * @param userId - Signed-in user identifier.
 * @returns Serialized checklists ordered by recent updates.
 */
export async function listChecklistsForUser(userId: string): Promise<UserChecklist[]> {
  const rows = await prisma.userChecklist.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' }
  })

  return rows.map(serializeChecklist)
}

/**
 * Create a saved checklist for a user.
 *
 * @param userId - Signed-in user identifier.
 * @param input - Checklist payload.
 * @returns Serialized created checklist.
 */
export async function createChecklistForUser(
  userId: string,
  input: ChecklistCreateInput
): Promise<UserChecklist> {
  const row = await prisma.userChecklist.create({
    data: {
      userId,
      name: input.name,
      description: input.description || null,
      framework: input.framework ?? null,
      ruleIds: input.ruleIds
    }
  })

  return serializeChecklist(row)
}

/**
 * Update a checklist owned by a user.
 *
 * @param userId - Signed-in user identifier.
 * @param checklistId - Checklist identifier.
 * @param updates - Fields to update.
 * @returns Updated checklist or null when ownership check fails.
 */
export async function updateChecklistForUser(
  userId: string,
  checklistId: string,
  updates: ChecklistUpdateInput
): Promise<UserChecklist | null> {
  const existing = await prisma.userChecklist.findFirst({
    where: { id: checklistId, userId }
  })

  if (!existing) {
    return null
  }

  const updated = await prisma.userChecklist.update({
    where: { id: checklistId },
    data: updates
  })

  return serializeChecklist(updated)
}

/**
 * Delete a checklist owned by a user.
 *
 * @param userId - Signed-in user identifier.
 * @param checklistId - Checklist identifier.
 * @returns True when a row was deleted.
 */
export async function deleteChecklistForUser(
  userId: string,
  checklistId: string
): Promise<boolean> {
  const result = await prisma.userChecklist.deleteMany({
    where: { id: checklistId, userId }
  })

  return result.count > 0
}

/**
 * Enable public sharing for a checklist owned by a user.
 *
 * @param userId - Signed-in user identifier.
 * @param checklistId - Checklist identifier.
 * @returns Public identifier or null when ownership check fails.
 */
export async function shareChecklistForUser(
  userId: string,
  checklistId: string
): Promise<string | null> {
  const existing = await prisma.userChecklist.findFirst({
    where: { id: checklistId, userId }
  })

  if (!existing) {
    return null
  }

  const publicId = existing.publicId ?? generatePublicId()

  await prisma.userChecklist.update({
    where: { id: checklistId },
    data: { publicId }
  })

  return publicId
}

/**
 * Disable public sharing for a checklist owned by a user.
 *
 * @param userId - Signed-in user identifier.
 * @param checklistId - Checklist identifier.
 * @returns True when a row was updated.
 */
export async function unshareChecklistForUser(
  userId: string,
  checklistId: string
): Promise<boolean> {
  const result = await prisma.userChecklist.updateMany({
    where: { id: checklistId, userId },
    data: { publicId: null }
  })

  return result.count > 0
}
