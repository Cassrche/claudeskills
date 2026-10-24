'use client'

import { authClient } from '@repo/auth/auth-client'
import { routeHome, routeLists } from '@repo/config'
import { PageBreadcrumbs } from '@repo/design-system/custom/navigation/page-breadcrumbs'
import { ListChecks, Plus } from '@repo/design-system/icons'
import type { ChecklistFramework } from '@repo/types'
import { cn } from '@repo/utils'
import { useCallback, useEffect, useRef, useState } from 'react'
import { PageHero } from '@/components/content/page/page-hero'
import { useProgress } from '@/hooks/use-progress'
import { useUserChecklists } from '@/hooks/use-user-checklists'
import { startGitHubSignIn } from '@/lib/auth-actions'
import { getChecklistFrameworkLabel } from '@/lib/framework-preferences'
import { TELEMETRY_EVENTS, trackInteraction } from '@/lib/telemetry-interactions'
import { CreateChecklistForm } from './create-checklist-form'
import { UserChecklistCard } from './user-checklist-card'

/**
 * Render the client-side custom checklist manager.
 *
 * @returns Checklist management UI for the current browser session.
 */
export function ListsPageClient() {
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const { checklists, createChecklist, deleteChecklist, isLoading } = useUserChecklists()
  const { getCompletionStats } = useProgress()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newFramework, setNewFramework] = useState<ChecklistFramework | ''>('')
  const [signInError, setSignInError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isSignedIn = Boolean(session?.user?.id)
  const callbackUrl = routeLists()

  // Focus input when showing create form
  useEffect(() => {
    if (showCreateForm && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showCreateForm])

  // Handle create checklist
  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!newName.trim()) return

      trackInteraction(TELEMETRY_EVENTS.ctaClicked, {
        label: 'submit_new_checklist',
        location: 'lists_page',
        target: newFramework || 'none'
      })
      await createChecklist(
        newName.trim(),
        newDescription.trim() || undefined,
        undefined,
        newFramework || undefined
      )
      setNewName('')
      setNewDescription('')
      setNewFramework('')
      setShowCreateForm(false)
    },
    [newName, newDescription, newFramework, createChecklist]
  )

  return (
    <div className="container-content py-12 sm:py-16 lg:pt-5 lg:pb-20">
      <PageBreadcrumbs items={[{ label: 'Home', href: routeHome() }, { label: 'Lists' }]} />

      {isSessionPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg border border-border bg-card p-5">
              <div className="mb-4 flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-background-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-background-muted" />
                  <div className="h-3 w-full rounded bg-background-muted" />
                </div>
              </div>
              <div className="h-1.5 w-full rounded-full bg-background-muted" />
            </div>
          ))}
        </div>
      ) : !isSignedIn ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center sm:p-12">
          <ListChecks className="mx-auto mb-4 h-12 w-12 text-foreground-muted" />
          <h2 className="mb-2 font-semibold text-foreground text-xl">
            Sign in to create your checklists
          </h2>
          <p className="mx-auto mb-6 max-w-md text-foreground-muted">
            Sign in with GitHub to create personal checklists, sync across devices, and track your
            progress.
          </p>
          <button
            type="button"
            onClick={async () => {
              setSignInError(null)
              try {
                const { error } = await startGitHubSignIn(callbackUrl)
                if (error) {
                  setSignInError('Could not start sign in')
                }
              } catch {
                setSignInError('Could not start sign in')
              }
            }}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2',
              'bg-accent text-accent-foreground',
              'transition-colors hover:bg-accent-hover',
              'font-medium text-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            <span>Sign in with GitHub</span>
          </button>
          {signInError && <p className="mt-4 text-destructive text-sm">{signInError}</p>}
        </div>
      ) : (
        <>
          <PageHero
            title="Lists"
            description="Create custom checklists by adding rules from the checklist."
            actions={
              !showCreateForm ? (
                <button
                  type="button"
                  onClick={() => {
                    trackInteraction(TELEMETRY_EVENTS.ctaClicked, {
                      label: 'open_new_checklist_form',
                      location: 'lists_page',
                      target: 'page_hero'
                    })
                    setShowCreateForm(true)
                  }}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-4 py-2',
                    'bg-accent text-accent-foreground',
                    'transition-colors hover:bg-accent/90',
                    'font-medium text-sm'
                  )}
                >
                  <Plus className="h-4 w-4" />
                  <span>New Checklist</span>
                </button>
              ) : null
            }
          />

          {showCreateForm ? (
            <CreateChecklistForm
              inputRef={inputRef}
              name={newName}
              description={newDescription}
              framework={newFramework}
              onNameChange={setNewName}
              onDescriptionChange={setNewDescription}
              onFrameworkChange={setNewFramework}
              onSubmit={handleCreate}
              onCancel={() => {
                setShowCreateForm(false)
                setNewName('')
                setNewDescription('')
                setNewFramework('')
              }}
            />
          ) : null}

          {/* Checklists grid */}
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-lg border border-border bg-card p-5">
                  <div className="mb-4 flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-background-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 rounded bg-background-muted" />
                      <div className="h-3 w-full rounded bg-background-muted" />
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-background-muted" />
                </div>
              ))}
            </div>
          ) : checklists.length === 0 ? (
            <div className="py-16 text-center">
              <ListChecks className="mx-auto mb-4 h-12 w-12 text-foreground-muted" />
              <h3 className="mb-2 font-medium text-foreground text-lg">No checklists yet</h3>
              <p className="mb-4 text-foreground-muted">
                Create your first custom checklist to start organizing rules.
              </p>
              {!showCreateForm && (
                <button
                  type="button"
                  onClick={() => {
                    trackInteraction(TELEMETRY_EVENTS.ctaClicked, {
                      label: 'open_new_checklist_form',
                      location: 'lists_page',
                      target: 'empty_state'
                    })
                    setShowCreateForm(true)
                  }}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg px-4 py-2',
                    'bg-accent text-accent-foreground',
                    'transition-colors hover:bg-accent/90',
                    'font-medium text-sm'
                  )}
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Checklist</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {checklists.map(checklist => {
                const stats = getCompletionStats(checklist.ruleIds)
                const isComplete = stats.completed === stats.total && stats.total > 0
                const frameworkLabel = getChecklistFrameworkLabel(checklist.framework)

                return (
                  <UserChecklistCard
                    key={checklist.id}
                    id={checklist.id}
                    name={checklist.name}
                    description={checklist.description}
                    frameworkLabel={frameworkLabel ?? undefined}
                    ruleCount={checklist.ruleIds.length}
                    stats={stats}
                    isComplete={isComplete}
                    updatedAt={checklist.updatedAt}
                    onDelete={() => deleteChecklist(checklist.id)}
                  />
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
