'use client'

import { isChecklistFramework } from '@repo/config'
import {
  Clock,
  Copy,
  Download,
  Edit2,
  ListChecks,
  Save,
  Share2,
  Trash2,
  X
} from '@repo/design-system/icons'
import type { ChecklistFramework } from '@repo/types'
import { cn } from '@repo/utils'
import type { RefObject } from 'react'
import { ChecklistFrameworkSelect } from '@/app/(site)/lists/checklist-framework-select'
import { getChecklistFrameworkLabel } from '@/lib/framework-preferences'

interface ChecklistSummary {
  name: string
  description?: string
  framework?: ChecklistFramework
  updatedAt: string
}

interface ChecklistEditFormProps {
  editName: string
  editDescription: string
  editFramework: ChecklistFramework | ''
  nameInputRef: RefObject<HTMLInputElement | null>
  onEditNameChange: (value: string) => void
  onEditDescriptionChange: (value: string) => void
  onEditFrameworkChange: (value: ChecklistFramework | '') => void
  onSave: () => void
  onCancel: () => void
}

/** Render the inline checklist edit form. */
export function ChecklistEditForm({
  editName,
  editDescription,
  editFramework,
  nameInputRef,
  onEditNameChange,
  onEditDescriptionChange,
  onEditFrameworkChange,
  onSave,
  onCancel
}: ChecklistEditFormProps) {
  return (
    <div className="max-w-xl space-y-4">
      <div>
        <label htmlFor="edit-name" className="sr-only">
          Name
        </label>
        <input
          ref={nameInputRef}
          id="edit-name"
          type="text"
          value={editName}
          onChange={e => onEditNameChange(e.target.value)}
          className={cn(
            'w-full rounded-lg px-3 py-2',
            'border border-border bg-background',
            'font-semibold text-foreground text-lg',
            'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50'
          )}
        />
      </div>
      <ChecklistFrameworkSelect
        id="edit-framework"
        label="Framework"
        value={editFramework}
        onChange={onEditFrameworkChange}
      />
      <div>
        <label htmlFor="edit-description" className="sr-only">
          Description
        </label>
        <input
          id="edit-description"
          type="text"
          value={editDescription}
          onChange={e => onEditDescriptionChange(e.target.value)}
          placeholder="Add a description..."
          className={cn(
            'w-full rounded-lg px-3 py-2',
            'border border-border bg-background',
            'text-foreground text-sm',
            'placeholder:text-foreground-muted',
            'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50'
          )}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={!editName.trim()}
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-1.5',
            'bg-accent text-accent-foreground',
            'transition-colors hover:bg-accent/90',
            'font-medium text-sm',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          <Save className="h-4 w-4" />
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-1.5',
            'text-foreground-muted hover:text-foreground',
            'transition-colors hover:bg-background-subtle',
            'font-medium text-sm'
          )}
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
      </div>
    </div>
  )
}

interface ChecklistOverviewProps {
  checklist: ChecklistSummary
  checklistRulesCount: number
  shareUrl?: string
  isShareLoading?: boolean
  onStartEditing: () => void
  onExport: () => void
  onDelete: () => void
  onShare?: () => void
  onUnshare?: () => void
  onCopyShareLink?: () => void
  shareCopied?: boolean
}

/** Render the read-only checklist header actions and metadata. */
export function ChecklistOverview({
  checklist,
  checklistRulesCount,
  shareUrl,
  isShareLoading,
  onStartEditing,
  onExport,
  onDelete,
  onShare,
  onUnshare,
  onCopyShareLink,
  shareCopied
}: ChecklistOverviewProps) {
  const frameworkLabel = isChecklistFramework(checklist.framework)
    ? getChecklistFrameworkLabel(checklist.framework)
    : null

  return (
    <>
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
            <ListChecks className="h-5 w-5 text-accent" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground text-xl tracking-tight">
              {checklist.name}
            </h1>
            {checklist.description && (
              <p className="mt-1 text-foreground-muted text-sm">{checklist.description}</p>
            )}
            {frameworkLabel ? (
              <p className="mt-2 text-foreground-muted text-xs uppercase tracking-[0.18em]">
                Framework: {frameworkLabel}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {shareUrl ? (
            <>
              <button
                type="button"
                onClick={onCopyShareLink}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm',
                  'text-foreground-muted hover:text-foreground',
                  'transition-colors hover:bg-background-subtle'
                )}
                aria-label="Copy share link"
              >
                <Copy className="h-4 w-4" />
                {shareCopied ? 'Copied' : 'Copy link'}
              </button>
              {onUnshare && (
                <button
                  type="button"
                  onClick={onUnshare}
                  disabled={isShareLoading}
                  className={cn(
                    'rounded-md px-2 py-1.5 text-foreground-muted text-sm',
                    'hover:bg-background-subtle hover:text-foreground',
                    'disabled:opacity-50'
                  )}
                >
                  Unshare
                </button>
              )}
            </>
          ) : (
            onShare && (
              <button
                type="button"
                onClick={onShare}
                disabled={isShareLoading}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm',
                  'text-foreground-muted hover:text-foreground',
                  'transition-colors hover:bg-background-subtle',
                  'disabled:opacity-50'
                )}
                aria-label="Share checklist"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
            )
          )}
          <button
            type="button"
            onClick={onStartEditing}
            className={cn(
              'rounded-md p-2',
              'text-foreground-muted hover:text-foreground',
              'transition-colors hover:bg-background-subtle'
            )}
            aria-label="Edit checklist"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onExport}
            className={cn(
              'rounded-md p-2',
              'text-foreground-muted hover:text-foreground',
              'transition-colors hover:bg-background-subtle'
            )}
            aria-label="Export checklist"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className={cn(
              'rounded-md p-2',
              'text-red-600 dark:text-red-400',
              'transition-colors hover:bg-red-50 dark:hover:bg-red-950/30'
            )}
            aria-label="Delete checklist"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-foreground-muted text-sm">
        <span>{checklistRulesCount} rules</span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          Updated {formatUpdatedDate(checklist.updatedAt)}
        </span>
      </div>
    </>
  )
}

/**
 * Format the checklist timestamp shown in the header.
 *
 * @param updatedAt - ISO date string of the latest checklist update.
 * @returns Human-readable short date.
 */
function formatUpdatedDate(updatedAt: string) {
  return new Date(updatedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}
