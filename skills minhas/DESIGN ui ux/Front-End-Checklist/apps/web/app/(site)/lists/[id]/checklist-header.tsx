'use client'

import type { ChecklistFramework } from '@repo/types'
import type { RefObject } from 'react'
import { ChecklistEditForm, ChecklistOverview } from './checklist-header-sections'
import { ChecklistProgressCard } from './checklist-progress-card'

interface ChecklistSummary {
  name: string
  description?: string
  framework?: ChecklistFramework
  updatedAt: string
}

interface ChecklistStats {
  total: number
  completed: number
  percentage: number
  remaining: number
}

interface ChecklistHeaderProps {
  checklist: ChecklistSummary
  checklistRulesCount: number
  stats: ChecklistStats
  isEditing: boolean
  editName: string
  editDescription: string
  editFramework: ChecklistFramework | ''
  nameInputRef: RefObject<HTMLInputElement | null>
  onEditNameChange: (value: string) => void
  onEditDescriptionChange: (value: string) => void
  onEditFrameworkChange: (value: ChecklistFramework | '') => void
  onSave: () => void
  onCancel: () => void
  onStartEditing: () => void
  onExport: () => void
  onDelete: () => void
  onResetProgress: () => void
  shareUrl?: string
  isShareLoading?: boolean
  onShare?: () => void
  onUnshare?: () => void
  onCopyShareLink?: () => void
  shareCopied?: boolean
}

/**
 * Render the editable checklist header and progress summary.
 *
 * @param props - Header state, checklist data, and handlers.
 */
export function ChecklistHeader({
  checklist,
  checklistRulesCount,
  stats,
  isEditing,
  editName,
  editDescription,
  editFramework,
  nameInputRef,
  onEditNameChange,
  onEditDescriptionChange,
  onEditFrameworkChange,
  onSave,
  onCancel,
  onStartEditing,
  onExport,
  onDelete,
  onResetProgress,
  shareUrl,
  isShareLoading,
  onShare,
  onUnshare,
  onCopyShareLink,
  shareCopied
}: ChecklistHeaderProps) {
  return (
    <header className="mb-6 sm:mb-8">
      {isEditing ? (
        <ChecklistEditForm
          editName={editName}
          editDescription={editDescription}
          editFramework={editFramework}
          nameInputRef={nameInputRef}
          onEditNameChange={onEditNameChange}
          onEditDescriptionChange={onEditDescriptionChange}
          onEditFrameworkChange={onEditFrameworkChange}
          onSave={onSave}
          onCancel={onCancel}
        />
      ) : (
        <>
          <ChecklistOverview
            checklist={checklist}
            checklistRulesCount={checklistRulesCount}
            shareUrl={shareUrl}
            isShareLoading={isShareLoading}
            onStartEditing={onStartEditing}
            onExport={onExport}
            onDelete={onDelete}
            onShare={onShare}
            onUnshare={onUnshare}
            onCopyShareLink={onCopyShareLink}
            shareCopied={shareCopied}
          />
          {checklistRulesCount > 0 && (
            <ChecklistProgressCard stats={stats} onResetProgress={onResetProgress} />
          )}
        </>
      )}
    </header>
  )
}
