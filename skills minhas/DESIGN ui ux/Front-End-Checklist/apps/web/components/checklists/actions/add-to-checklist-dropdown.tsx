'use client'

import { authClient } from '@repo/auth/auth-client'
import { Check, ChevronDown, ListPlus, Plus } from '@repo/design-system/icons'
import { cn } from '@repo/utils'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useUserChecklists } from '@/hooks/use-user-checklists'
import { startGitHubSignIn } from '@/lib/auth-actions'

interface AddToChecklistDropdownProps {
  ruleId: string
  className?: string
}

/**
 * Dropdown component to add a rule to user-created checklists
 */
export function AddToChecklistDropdown({ ruleId, className }: AddToChecklistDropdownProps) {
  const checklistNameInputId = `new-checklist-name-${ruleId}`
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newChecklistName, setNewChecklistName] = useState('')
  const [signInError, setSignInError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: session } = authClient.useSession()
  const isSignedIn = Boolean(session?.user?.id)
  const callbackUrl = pathname || '/'

  const { checklists, createChecklist, addRule, removeRule, isRuleInChecklist, isSaving } =
    useUserChecklists()

  useEffect(() => {
    /** Close the dropdown when interaction moves outside the component boundary. */
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        event.target instanceof Node &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false)
        setShowNewForm(false)
        setNewChecklistName('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (showNewForm && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showNewForm])

  const handleToggleRule = useCallback(
    (checklistId: string) => {
      if (isRuleInChecklist(checklistId, ruleId)) {
        removeRule(checklistId, ruleId)
      } else {
        addRule(checklistId, ruleId)
      }
    },
    [ruleId, isRuleInChecklist, addRule, removeRule]
  )

  const handleCreateChecklist = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!newChecklistName.trim()) return

      const newChecklist = await createChecklist(newChecklistName.trim())
      if (newChecklist) {
        addRule(newChecklist.id, ruleId)
      }

      setNewChecklistName('')
      setShowNewForm(false)
    },
    [newChecklistName, createChecklist, addRule, ruleId]
  )

  const handleTriggerClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsOpen(prev => !prev)
  }, [])

  const handleDropdownClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  const containingCount = checklists.filter(c => c.ruleIds.includes(ruleId)).length

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={handleTriggerClick}
        disabled={isSaving}
        className={cn(
          'flex items-center gap-1.5 rounded px-3 py-1.5',
          'font-medium text-xs',
          'border border-foreground/20',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          containingCount > 0
            ? 'border-accent/30 bg-accent/5 text-accent hover:bg-accent/10'
            : 'text-foreground-muted hover:bg-background-subtle hover:text-foreground',
          isSaving && 'cursor-not-allowed opacity-50'
        )}
        aria-label={`Add to checklist (in ${containingCount} checklists)`}
        aria-expanded={isOpen}
      >
        <ListPlus className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{containingCount > 0 ? `In ${containingCount}` : 'Add'}</span>
        <ChevronDown
          className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          onClick={handleDropdownClick}
          onKeyDown={e => e.stopPropagation()}
          className={cn(
            'absolute top-full right-0 z-50 mt-1',
            'max-h-64 w-56 overflow-auto',
            'rounded-lg border border-border bg-background shadow-lg',
            'fade-in-0 zoom-in-95 slide-in-from-top-2 animate-in',
            'duration-150'
          )}
          role="menu"
          aria-orientation="vertical"
        >
          {!isSignedIn ? (
            <div className="p-3">
              <p className="mb-3 text-foreground-muted text-sm">
                Sign in with GitHub to save rules to your checklists.
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
                  'w-full rounded-md px-2 py-1.5 font-medium text-xs',
                  'bg-accent text-accent-foreground',
                  'transition-colors hover:bg-accent-hover',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                )}
              >
                Sign in with GitHub
              </button>
              {signInError && <p className="mt-2 text-destructive text-xs">{signInError}</p>}
            </div>
          ) : (
            <>
              <div className="border-border border-b px-3 py-2">
                <p className="font-medium text-foreground text-xs">Add to checklist</p>
              </div>

              {checklists.length > 0 ? (
                <div className="py-1">
                  {checklists.map(checklist => {
                    const isInChecklist = isRuleInChecklist(checklist.id, ruleId)
                    return (
                      <button
                        key={checklist.id}
                        type="button"
                        onClick={() => handleToggleRule(checklist.id)}
                        className={cn(
                          'flex w-full items-center gap-2 px-3 py-2 text-left',
                          'text-foreground text-sm',
                          'transition-colors hover:bg-background-subtle',
                          'focus-visible:bg-background-subtle focus-visible:outline-none'
                        )}
                        role="menuitemcheckbox"
                        aria-checked={isInChecklist}
                      >
                        <div
                          className={cn(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                            isInChecklist ? 'border-accent bg-accent' : 'border-foreground/30'
                          )}
                        >
                          {isInChecklist && (
                            <Check className="h-3 w-3 text-white" strokeWidth={2.5} />
                          )}
                        </div>
                        <span className="truncate">{checklist.name}</span>
                        <span className="ml-auto text-foreground-muted text-xs">
                          {checklist.ruleIds.length}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="px-3 py-4 text-center text-foreground-muted text-sm">
                  No checklists yet
                </div>
              )}

              <div className="border-border border-t p-2">
                {showNewForm ? (
                  <form onSubmit={handleCreateChecklist} className="space-y-2">
                    <label htmlFor={checklistNameInputId} className="sr-only">
                      Checklist name
                    </label>
                    <input
                      ref={inputRef}
                      id={checklistNameInputId}
                      type="text"
                      value={newChecklistName}
                      onChange={e => setNewChecklistName(e.target.value)}
                      placeholder="Checklist name..."
                      className={cn(
                        'w-full rounded-md px-2 py-1.5 text-sm',
                        'border border-border bg-background',
                        'placeholder:text-foreground-muted',
                        'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50'
                      )}
                      autoComplete="off"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={!newChecklistName.trim()}
                        className={cn(
                          'flex-1 rounded-md px-2 py-1 font-medium text-xs',
                          'bg-accent text-accent-foreground',
                          'transition-colors hover:bg-accent/90',
                          'disabled:cursor-not-allowed disabled:opacity-50'
                        )}
                      >
                        Create
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewForm(false)
                          setNewChecklistName('')
                        }}
                        className={cn(
                          'rounded-md px-2 py-1 font-medium text-xs',
                          'text-foreground-muted hover:text-foreground',
                          'transition-colors hover:bg-background-subtle'
                        )}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowNewForm(true)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5',
                      'text-accent text-sm',
                      'transition-colors hover:bg-accent/10'
                    )}
                  >
                    <Plus className="h-4 w-4" />
                    <span>New checklist</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
