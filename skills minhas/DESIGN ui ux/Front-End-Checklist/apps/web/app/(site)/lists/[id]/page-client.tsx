'use client'

import { authClient } from '@repo/auth/auth-client'
import { routeLists, routeSharedChecklist, SITE_URL } from '@repo/config'
import { ConfirmDialog } from '@repo/design-system/custom/feedback/confirm-dialog'
import type { ChecklistFramework } from '@repo/types'
import { allRules } from 'content-collections'
import { useParams, useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useProgress } from '@/hooks/use-progress'
import { useUserChecklists } from '@/hooks/use-user-checklists'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'
import { trackInteraction } from '@/lib/telemetry-interactions'
import { ChecklistHeader } from './checklist-header'
import { ChecklistRulesSection } from './checklist-rules-section'
import { ChecklistBreadcrumbs, ChecklistNotFoundState, PageSkeleton } from './page-states'

interface ChecklistRule {
  id: string
  title: string
  description?: string
  slug: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  primaryCategory: string
  categories: string[]
  subcategory?: string | null
  language: string
}

interface ChecklistStats {
  total: number
  completed: number
  percentage: number
  remaining: number
}

/**
 * UserChecklistDetailPage function.
 */
export function UserChecklistDetailPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <UserChecklistDetailContent />
    </Suspense>
  )
}

/**
 * UserChecklistDetailContent function.
 */
function UserChecklistDetailContent() {
  const params = useParams()
  const router = useRouter()
  const checklistId = typeof params.id === 'string' ? params.id : ''

  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const {
    getChecklist,
    updateChecklist,
    deleteChecklist,
    removeRule,
    exportChecklist,
    enableShare,
    disableShare,
    isLoading,
    isShareLoading
  } = useUserChecklists()
  const { getCompletionStats, resetRulesProgress } = useProgress()

  useEffect(() => {
    if (isSessionPending) return
    if (!session?.user?.id) {
      router.replace(routeLists())
    }
  }, [isSessionPending, session?.user?.id, router])

  const checklist = getChecklist(checklistId)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editFramework, setEditFramework] = useState<ChecklistFramework | ''>('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && nameInputRef.current) {
      nameInputRef.current.focus()
    }
  }, [isEditing])

  const checklistRules = useMemo<ChecklistRule[]>(() => {
    if (!checklist) {
      return []
    }

    const langRules = allRules.filter(rule => rule.language === 'en')
    const ruleMap = new Map(langRules.map(rule => [rule.id, rule]))

    return checklist.ruleIds
      .map(id => ruleMap.get(id))
      .filter((rule): rule is (typeof langRules)[0] => rule !== undefined)
      .map(rule => ({
        id: rule.id,
        title: rule.title,
        description: rule.description,
        slug: rule.slug,
        priority: rule.priority,
        primaryCategory: rule.primaryCategory,
        categories: rule.categories,
        subcategory: rule.subcategory,
        language: rule.language
      }))
  }, [checklist])

  const stats = useMemo<ChecklistStats>(() => {
    if (!checklist) {
      return { total: 0, completed: 0, percentage: 0, remaining: 0 }
    }

    return getCompletionStats(checklist.ruleIds)
  }, [checklist, getCompletionStats])

  const handleSaveEdit = useCallback(() => {
    if (!editName.trim()) {
      return
    }

    updateChecklist(checklistId, {
      name: editName.trim(),
      description: editDescription.trim() || undefined,
      framework: editFramework || undefined
    })
    setIsEditing(false)
  }, [checklistId, editDescription, editFramework, editName, updateChecklist])

  const startEditing = useCallback(() => {
    if (!checklist) {
      return
    }

    setEditName(checklist.name)
    setEditDescription(checklist.description || '')
    setEditFramework(checklist.framework || '')
    setIsEditing(true)
  }, [checklist])

  const cancelEditing = useCallback(() => {
    if (checklist) {
      setEditName(checklist.name)
      setEditDescription(checklist.description || '')
      setEditFramework(checklist.framework || '')
    }

    setIsEditing(false)
  }, [checklist])

  const handleDelete = useCallback(() => {
    deleteChecklist(checklistId)
    router.push(routeLists())
  }, [checklistId, deleteChecklist, router])

  const handleRemoveRule = useCallback(
    (ruleId: string) => {
      removeRule(checklistId, ruleId)
    },
    [checklistId, removeRule]
  )

  const handleResetProgress = useCallback(() => {
    if (checklist) {
      resetRulesProgress(checklist.ruleIds)
    }
  }, [checklist, resetRulesProgress])

  const shareUrl = checklist?.publicId
    ? `${SITE_URL}${routeSharedChecklist(checklist.publicId)}`
    : undefined

  const handleCopyShareLink = useCallback(async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      trackInteraction(TELEMETRY_EVENTS.copyActionCompleted, {
        checklistId,
        label: 'copy_checklist_share_link',
        location: 'checklist_detail',
        target: shareUrl
      })
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch {
      // ignore
    }
  }, [checklistId, shareUrl])

  /** Track and export the current checklist JSON. */
  const handleExportChecklist = useCallback(() => {
    trackInteraction(TELEMETRY_EVENTS.ctaClicked, {
      checklistId,
      label: 'export_checklist',
      location: 'checklist_detail',
      target: 'json'
    })
    exportChecklist(checklistId)
  }, [checklistId, exportChecklist])

  /** Track the public sharing intent before the server mutation records success. */
  const handleEnableShare = useCallback(() => {
    trackInteraction(TELEMETRY_EVENTS.shareActionClicked, {
      checklistId,
      label: 'share_checklist',
      location: 'checklist_detail',
      target: 'public_share'
    })
    enableShare(checklistId)
  }, [checklistId, enableShare])

  /** Track the unshare intent before the server mutation records success. */
  const handleDisableShare = useCallback(() => {
    trackInteraction(TELEMETRY_EVENTS.shareActionClicked, {
      checklistId,
      label: 'unshare_checklist',
      location: 'checklist_detail',
      target: 'public_share'
    })
    disableShare(checklistId)
  }, [checklistId, disableShare])

  const handleEditFrameworkChange = useCallback((value: ChecklistFramework | '') => {
    setEditFramework(value)
  }, [])

  if (isSessionPending || isLoading) {
    return <PageSkeleton />
  }

  if (!session?.user?.id) {
    return null
  }

  if (!checklist) {
    return <ChecklistNotFoundState />
  }

  return (
    <div className="container-content py-6 sm:py-8">
      <ChecklistBreadcrumbs checklistName={checklist.name} />

      <ChecklistHeader
        checklist={checklist}
        checklistRulesCount={checklistRules.length}
        stats={stats}
        isEditing={isEditing}
        editName={editName}
        editDescription={editDescription}
        editFramework={editFramework}
        nameInputRef={nameInputRef}
        onEditNameChange={setEditName}
        onEditDescriptionChange={setEditDescription}
        onEditFrameworkChange={handleEditFrameworkChange}
        onSave={handleSaveEdit}
        onCancel={cancelEditing}
        onStartEditing={startEditing}
        onExport={handleExportChecklist}
        onDelete={() => setShowDeleteConfirm(true)}
        onResetProgress={handleResetProgress}
        shareUrl={shareUrl}
        isShareLoading={isShareLoading}
        onShare={handleEnableShare}
        onUnshare={handleDisableShare}
        onCopyShareLink={handleCopyShareLink}
        shareCopied={shareCopied}
      />

      <ChecklistRulesSection
        checklistName={checklist.name}
        framework={checklist.framework}
        rules={checklistRules}
        onRemoveRule={handleRemoveRule}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Delete checklist?"
        description={`Are you sure you want to delete "${checklist.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  )
}
