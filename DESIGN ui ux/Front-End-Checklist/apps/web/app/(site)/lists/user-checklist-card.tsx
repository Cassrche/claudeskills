/** Card component for displaying a user-created checklist with progress and actions. */
'use client'

import { routeList } from '@repo/config'
import { Clock, ListChecks, MoreVertical, Trash2 } from '@repo/design-system/icons'
import { cn } from '@repo/utils'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

interface UserChecklistCardProps {
  id: string
  name: string
  description?: string
  frameworkLabel?: string
  ruleCount: number
  stats: { total: number; completed: number; percentage: number }
  isComplete: boolean
  updatedAt: string
  onDelete: () => void
}

/** Displays a user-created checklist with progress bar, metadata, and delete action. */
export function UserChecklistCard({
  id,
  name,
  description,
  frameworkLabel,
  ruleCount,
  stats,
  isComplete,
  updatedAt,
  onDelete
}: UserChecklistCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    /** Closes dropdown when clicking outside the menu area. */
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        event.target instanceof Node &&
        !menuRef.current.contains(event.target)
      ) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const formattedDate = new Date(updatedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  })

  return (
    <div
      className={cn(
        'relative rounded-lg p-5',
        'border border-border bg-card',
        'hover:border-border-focus hover:shadow-md',
        'transition-all duration-150',
        isComplete && 'border-l-4 border-l-accent'
      )}
    >
      <div className="mb-3 flex items-start gap-3">
        <div className="shrink-0 rounded-lg bg-background-subtle p-2.5 text-foreground-muted">
          <ListChecks className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-semibold text-foreground text-sm">
              <Link
                href={routeList(id)}
                className={cn(
                  'after:absolute after:inset-0 after:content-[""]',
                  'focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring'
                )}
              >
                {name}
              </Link>
            </h3>
            <div ref={menuRef} className="relative z-10">
              <button
                type="button"
                onClick={e => {
                  e.preventDefault()
                  setShowMenu(!showMenu)
                }}
                className={cn(
                  'rounded-md p-1',
                  'text-foreground-muted hover:text-foreground',
                  'transition-colors hover:bg-background-subtle'
                )}
                aria-label="More options"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {showMenu && (
                <div className="absolute top-full right-0 mt-1 w-36 rounded-lg border border-border bg-background py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={e => {
                      e.preventDefault()
                      onDelete()
                      setShowMenu(false)
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left',
                      'text-red-600 text-sm dark:text-red-400',
                      'transition-colors hover:bg-red-50 dark:hover:bg-red-950/30'
                    )}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
          {description && (
            <p className="mt-0.5 line-clamp-1 text-[13px] text-foreground-muted">{description}</p>
          )}
        </div>
      </div>

      <div className="mb-3 flex items-center gap-3 text-[11px] text-foreground-muted">
        <span>{ruleCount} rules</span>
        {frameworkLabel ? (
          <>
            <span>•</span>
            <span>{frameworkLabel}</span>
          </>
        ) : null}
        <span>•</span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formattedDate}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              stats.completed > 0 ? 'bg-accent' : 'bg-transparent'
            )}
            style={{ width: `${stats.percentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-foreground-muted">
            {stats.completed === 0
              ? 'Not started'
              : isComplete
                ? 'Complete!'
                : `${stats.percentage}% done`}
          </span>
          <span className="font-medium text-foreground tabular-nums">
            {stats.completed}/{stats.total}
          </span>
        </div>
      </div>
    </div>
  )
}
