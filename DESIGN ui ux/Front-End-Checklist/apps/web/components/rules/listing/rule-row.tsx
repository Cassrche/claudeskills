'use client'

import { Check, Minus, Plus } from '@repo/design-system/icons'
import { cn } from '@repo/utils'
import Link from 'next/link'
import { useCallback, useId, useState } from 'react'
import { AddToChecklistDropdown } from '@/components/checklists/actions/add-to-checklist-dropdown'
import { useRuleProgress } from '@/hooks/use-progress'
import { RuleRowBadges } from './rule-row-badges'

interface RuleRowProps {
  id: string
  title: string
  description?: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  categories?: string[]
  subcategory?: string | null
  href: string
  className?: string
  currentCategory?: string
  defaultExpanded?: boolean
  isExpanded?: boolean
  onExpandToggle?: (id: string, expanded: boolean) => void
}
const EMPTY_CATEGORIES: string[] = []

/**
 * Render an expandable checklist row for a single rule.
 * @param props - Rule row display and interaction props.
 */
export function RuleRow({
  id,
  title,
  description,
  priority,
  categories = EMPTY_CATEGORIES,
  subcategory: _subcategory,
  href,
  className,
  currentCategory,
  defaultExpanded = false,
  isExpanded: controlledExpanded,
  onExpandToggle
}: RuleRowProps) {
  const checkboxId = useId()
  const contentId = useId()
  const { isCompleted, toggleCompletion, isSaving } = useRuleProgress(id)
  const [internalExpanded, setInternalExpanded] = useState<boolean | null>(null)
  const isControlled = controlledExpanded !== undefined
  const isExpanded = isControlled ? controlledExpanded : (internalExpanded ?? defaultExpanded)

  // Handle checkbox click
  const handleCheckboxClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      toggleCompletion()
    },
    [toggleCompletion]
  )

  // Handle checkbox keyboard
  const handleCheckboxKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        toggleCompletion()
      }
    },
    [toggleCompletion]
  )

  const handleExpandToggle = useCallback(() => {
    const newExpanded = !isExpanded
    if (isControlled && onExpandToggle) {
      onExpandToggle(id, newExpanded)
    } else {
      setInternalExpanded(newExpanded)
    }
  }, [isExpanded, isControlled, onExpandToggle, id])

  const handleExpandKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        handleExpandToggle()
      }
    },
    [handleExpandToggle]
  )

  return (
    <div
      className={cn(
        'group relative',
        'border-foreground/20 border-b',
        'transition-all duration-300 ease-out',
        isSaving && 'pointer-events-none opacity-50',
        isCompleted && 'text-foreground-muted',
        className
      )}
    >
      {/* Header Row */}
      <div className={cn('flex items-center gap-4 py-5')}>
        {/* Checkbox - square with visible border */}
        <button
          type="button"
          aria-pressed={isCompleted}
          aria-labelledby={`${checkboxId}-label`}
          onClick={handleCheckboxClick}
          onKeyDown={handleCheckboxKeyDown}
          className={cn(
            'flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center',
            'transition-all duration-150',
            'outline outline-2 outline-transparent outline-offset-[3px]',
            'hover:outline-primary',
            'focus-visible:outline-primary',
            isCompleted ? 'bg-accent' : ''
          )}
          style={{
            border: isCompleted ? '2px solid var(--color-accent)' : '2px solid currentColor'
          }}
        >
          {isCompleted && <Check className="h-3.5 w-3.5 text-accent-foreground" strokeWidth={3} />}
          <span className="sr-only">{isCompleted ? 'Mark as incomplete' : 'Mark as complete'}</span>
        </button>

        {/* Title - navigates to rule detail page */}
        <Link
          href={href}
          id={`${checkboxId}-label`}
          onClick={e => e.stopPropagation()}
          className={cn(
            'min-w-0 shrink text-left',
            'rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'decoration-primary/60 underline-offset-2 hover:underline',
            'group/title'
          )}
        >
          <h4
            className={cn(
              'font-normal text-[17px] leading-relaxed',
              'text-foreground transition-colors duration-150 group-hover/title:text-primary',
              isCompleted && 'text-foreground-muted line-through'
            )}
          >
            {title}
          </h4>
        </Link>

        {/* Spacer - clickable empty area that triggers expand/collapse */}
        <button
          type="button"
          onClick={handleExpandToggle}
          aria-hidden="true"
          tabIndex={-1}
          className="flex-1 cursor-pointer self-stretch"
        />

        {/* Category badges */}
        <RuleRowBadges
          categories={categories}
          currentCategory={currentCategory}
          priority={priority}
          isCompleted={isCompleted}
        />

        {/* Add button - desktop only (mobile version is in expanded content) */}
        <div className="hidden shrink-0 sm:block">
          <AddToChecklistDropdown ruleId={id} />
        </div>

        {/* Expand/Collapse Icon - Blue accent color */}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            handleExpandToggle()
          }}
          onKeyDown={handleExpandKeyDown}
          aria-expanded={isExpanded}
          aria-controls={contentId}
          aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
          className={cn(
            'flex shrink-0 items-center justify-center',
            '-m-2.5 p-2.5',
            'text-accent',
            'hover:text-accent/80',
            'rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'transition-colors duration-150',
            isCompleted && 'text-foreground-subtle'
          )}
        >
          {isExpanded ? (
            <Minus className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <Plus className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Expandable Content */}
      <div
        id={contentId}
        className={cn(
          'transition-all duration-150 ease-out',
          isExpanded
            ? 'max-h-[500px] overflow-visible opacity-100'
            : 'max-h-0 overflow-hidden opacity-0'
        )}
        aria-hidden={!isExpanded}
      >
        <div className="pt-2 pb-6 pl-[34px]">
          {/* Description - directly under title */}
          {description && (
            <p className="max-w-3xl text-[15px] text-foreground-muted leading-relaxed">
              {description}
            </p>
          )}

          {/* Mobile only: badges + Add button (desktop shows these in the header row) */}
          <div className="mt-3 flex flex-wrap items-center gap-2 sm:hidden">
            <RuleRowBadges
              categories={categories}
              currentCategory={currentCategory}
              priority={priority}
              isCompleted={isCompleted}
              mobile
            >
              <AddToChecklistDropdown ruleId={id} />
            </RuleRowBadges>
          </div>
        </div>
      </div>
    </div>
  )
}

/* Skeleton loader for RuleRow */
export function RuleRowSkeleton() {
  return (
    <div className="animate-pulse border-foreground/20 border-b">
      <div className="flex items-center gap-4 py-5">
        <div className="h-[18px] w-[18px] bg-foreground/15" />
        <div className="h-5 flex-1 rounded bg-foreground/15" />
        <div className="h-5 w-5 rounded bg-foreground/15" />
      </div>
    </div>
  )
}
