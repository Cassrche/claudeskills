'use server'

import { checklistFrameworkSchema } from '@repo/schemas'
import { z } from 'zod'
import { throwIfBot } from '@/lib/bot-protection'
import { authActionClient } from '@/lib/safe-action'
import {
  createChecklistForUser,
  deleteChecklistForUser,
  shareChecklistForUser,
  unshareChecklistForUser,
  updateChecklistForUser
} from '@/lib/server/checklist-service'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'
import { trackServerEvent } from '@/lib/telemetry-server'

const checklistIdSchema = z.object({
  id: z.string().trim().min(1)
})

const createChecklistSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  framework: checklistFrameworkSchema.optional(),
  ruleIds: z.array(z.string()).default([])
})

const updateChecklistSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  framework: checklistFrameworkSchema.nullable().optional(),
  color: z.string().trim().max(64).nullable().optional(),
  ruleIds: z.array(z.string()).optional()
})

/**
 * Create a new saved checklist for the current signed-in user.
 */
export const createChecklistAction = authActionClient
  .metadata({ actionName: 'create-checklist' })
  .inputSchema(createChecklistSchema)
  .action(async ({ parsedInput, ctx }) => {
    await throwIfBot()

    const checklist = await createChecklistForUser(ctx.userId, {
      name: parsedInput.name,
      description: parsedInput.description,
      framework: parsedInput.framework,
      ruleIds: parsedInput.ruleIds
    })

    trackServerEvent(TELEMETRY_EVENTS.checklistCreated, {
      checklistId: checklist.id,
      ruleCount: checklist.ruleIds.length,
      userId: ctx.userId
    })

    return checklist
  })

/**
 * Update a saved checklist owned by the current signed-in user.
 */
export const updateChecklistAction = authActionClient
  .metadata({ actionName: 'update-checklist' })
  .inputSchema(updateChecklistSchema)
  .action(async ({ parsedInput, ctx }) => {
    await throwIfBot()

    const checklist = await updateChecklistForUser(ctx.userId, parsedInput.id, {
      name: parsedInput.name?.trim(),
      description:
        parsedInput.description === undefined ? undefined : parsedInput.description?.trim() || null,
      framework: parsedInput.framework,
      color: parsedInput.color === undefined ? undefined : parsedInput.color?.trim() || null,
      ruleIds: parsedInput.ruleIds
    })

    if (!checklist) {
      throw new Error('Checklist not found')
    }

    trackServerEvent(TELEMETRY_EVENTS.checklistUpdated, {
      checklistId: checklist.id,
      updatedFields: Object.keys(parsedInput).filter(key => key !== 'id'),
      userId: ctx.userId
    })

    return checklist
  })

/**
 * Delete a saved checklist owned by the current signed-in user.
 */
export const deleteChecklistAction = authActionClient
  .metadata({ actionName: 'delete-checklist' })
  .inputSchema(checklistIdSchema)
  .action(async ({ parsedInput, ctx }) => {
    await throwIfBot()

    const deleted = await deleteChecklistForUser(ctx.userId, parsedInput.id)

    if (!deleted) {
      throw new Error('Checklist not found')
    }

    trackServerEvent(TELEMETRY_EVENTS.checklistDeleted, {
      checklistId: parsedInput.id,
      userId: ctx.userId
    })

    return { success: true }
  })

/**
 * Enable public sharing for a saved checklist.
 */
export const shareChecklistAction = authActionClient
  .metadata({ actionName: 'share-checklist' })
  .inputSchema(checklistIdSchema)
  .action(async ({ parsedInput, ctx }) => {
    const publicId = await shareChecklistForUser(ctx.userId, parsedInput.id)

    if (!publicId) {
      throw new Error('Checklist not found')
    }

    trackServerEvent(TELEMETRY_EVENTS.checklistShared, {
      checklistId: parsedInput.id,
      publicId,
      userId: ctx.userId
    })

    return { publicId }
  })

/**
 * Disable public sharing for a saved checklist.
 */
export const unshareChecklistAction = authActionClient
  .metadata({ actionName: 'unshare-checklist' })
  .inputSchema(checklistIdSchema)
  .action(async ({ parsedInput, ctx }) => {
    const unshared = await unshareChecklistForUser(ctx.userId, parsedInput.id)

    if (!unshared) {
      throw new Error('Checklist not found')
    }

    trackServerEvent(TELEMETRY_EVENTS.checklistUnshared, {
      checklistId: parsedInput.id,
      userId: ctx.userId
    })

    return { success: true }
  })
