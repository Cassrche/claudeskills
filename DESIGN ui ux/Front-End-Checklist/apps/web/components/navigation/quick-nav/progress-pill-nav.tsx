'use client'

import type { LucideIcon } from '@repo/design-system/icons'
import { cn } from '@repo/utils'
import { cva } from 'class-variance-authority'
import type { ReactNode } from 'react'

const progressPillVariants = cva(
  [
    'group inline-flex items-center gap-2 rounded-full px-3 py-2',
    'shrink-0 whitespace-nowrap border border-border bg-background',
    'transition-all duration-150',
    'hover:border-border-focus hover:bg-background-subtle',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
  ],
  {
    variants: {
      state: {
        default: '',
        complete: 'border-accent/50 bg-accent/5'
      }
    },
    defaultVariants: {
      state: 'default'
    }
  }
)

export const progressPillClassName = progressPillVariants()

interface ProgressPillContentProps {
  title: string
  count: number
  isComplete: boolean
  hasProgress: boolean
  progressLabel: string
  icon?: LucideIcon
  titleClassName?: string
}

/** Render a labeled horizontal container for quick navigation pills. */
export function ProgressPillNav({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-6 sm:mt-8">
      <p className="mb-3 text-foreground-muted text-sm">{label}</p>
      <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
        {children}
      </div>
    </div>
  )
}

/** Render the shared content layout for a quick-nav pill. */
export function ProgressPillContent({
  title,
  count,
  isComplete,
  hasProgress,
  progressLabel,
  icon: Icon,
  titleClassName
}: ProgressPillContentProps) {
  return (
    <>
      {Icon ? (
        <Icon
          className={cn(
            'h-4 w-4 shrink-0 text-foreground-muted transition-colors duration-150 group-hover:text-accent',
            isComplete && 'text-accent'
          )}
          aria-hidden="true"
        />
      ) : null}
      <span
        className={cn(
          'font-medium text-foreground text-sm transition-colors duration-150 group-hover:text-accent',
          isComplete && 'text-accent',
          titleClassName
        )}
      >
        {title}
      </span>
      <span className="text-foreground-muted text-xs tabular-nums">{count}</span>
      {hasProgress ? (
        <span
          className={cn('h-2 w-2 shrink-0 rounded-full', isComplete ? 'bg-accent' : 'bg-accent/50')}
          aria-label={progressLabel}
        />
      ) : null}
    </>
  )
}
