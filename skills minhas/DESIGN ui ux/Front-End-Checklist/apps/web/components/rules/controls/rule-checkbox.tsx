'use client'

import { CheckCircle2, Circle, Loader2 } from '@repo/design-system/icons'
import { Checkbox } from '@repo/design-system/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@repo/design-system/ui/tooltip'
import { cn } from '@repo/utils'
import { useRuleProgress } from '@/hooks/use-progress'

interface RuleCheckboxProps {
  ruleId: string
  ruleTitle: string
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'card'
  hideLabel?: boolean
  cardLabel?: string
}

/**
 * Render the primary completion checkbox for a rule.
 *
 * @param props - Rule identifier and presentation options.
 */
export function RuleCheckbox({
  ruleId,
  ruleTitle,
  className = '',
  size = 'md',
  variant = 'default',
  hideLabel = false,
  cardLabel = 'Done'
}: RuleCheckboxProps) {
  const { isCompleted, toggleCompletion, isSaving } = useRuleProgress(ruleId)

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-7 w-7'
  }

  const checkbox = (
    <Checkbox
      id={`rule-${ruleId}`}
      checked={isCompleted}
      onCheckedChange={toggleCompletion}
      disabled={isSaving}
      className={cn(
        sizeClasses[size],
        variant === 'card' && [
          'rounded-md border-border bg-background',
          'data-[state=checked]:border-accent data-[state=checked]:bg-accent'
        ]
      )}
      aria-label={`Mark "${ruleTitle}" as ${isCompleted ? 'incomplete' : 'complete'}`}
    />
  )

  if (variant === 'card') {
    return (
      <TooltipProvider delayDuration={250}>
        <Tooltip>
          <TooltipTrigger asChild>
            <label
              htmlFor={`rule-${ruleId}`}
              className={cn(
                'inline-flex flex-col items-center gap-1.5 text-center',
                'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
                className
              )}
            >
              <span
                className={cn(
                  'inline-flex h-12 w-12 items-center justify-center rounded-xl border transition-colors',
                  isCompleted
                    ? 'border-accent/40 bg-accent/14'
                    : 'border-border bg-background-subtle/70 hover:bg-background-muted'
                )}
              >
                {checkbox}
              </span>
              <span
                className={cn(
                  'font-medium text-[11px] leading-none',
                  isCompleted ? 'text-foreground' : 'text-foreground-muted'
                )}
              >
                {cardLabel}
              </span>
            </label>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {isSaving ? 'Saving...' : isCompleted ? 'Mark incomplete' : 'Mark complete'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {checkbox}
      {!hideLabel && (
        <label
          htmlFor={`rule-${ruleId}`}
          className="cursor-pointer select-none text-foreground-muted text-sm"
        >
          {isCompleted ? 'Completed' : 'Mark as complete'}
        </label>
      )}

      {isSaving && (
        <span className="text-foreground-muted text-xs" aria-live="polite">
          Saving...
        </span>
      )}
    </div>
  )
}

/**
 * Button-styled completion control for rule pages
 * More prominent than checkbox, shows clear state change
 */
interface RuleCompletionButtonProps {
  ruleId: string
  ruleTitle: string
  className?: string
}

/**
 * Render the prominent button-style completion control used on some rule views.
 *
 * @param props - Rule identifier and button presentation props.
 */
export function RuleCompletionButton({
  ruleId,
  ruleTitle,
  className = ''
}: RuleCompletionButtonProps) {
  const { isCompleted, toggleCompletion, isSaving } = useRuleProgress(ruleId)

  return (
    <button
      type="button"
      onClick={() => toggleCompletion()}
      disabled={isSaving}
      className={cn(
        'inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-md border px-4 py-2 font-medium text-sm transition-colors duration-150',
        'border-accent/20 bg-accent/10 text-accent hover:border-accent hover:bg-accent/20',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60',
        isCompleted &&
          'border-success bg-success text-success-foreground hover:border-success hover:bg-success hover:text-success-foreground',
        className
      )}
      aria-label={`Mark "${ruleTitle}" as ${isCompleted ? 'incomplete' : 'complete'}`}
      aria-pressed={isCompleted}
    >
      {isSaving ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>Saving...</span>
        </>
      ) : isCompleted ? (
        <>
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          <span>Completed</span>
        </>
      ) : (
        <>
          <Circle className="h-4 w-4" aria-hidden="true" />
          <span>Mark complete</span>
        </>
      )}
    </button>
  )
}

interface CompactRuleCheckboxProps {
  ruleId: string
  ruleTitle: string
  className?: string
}

/**
 * Render the compact checkbox variant used in dense layouts.
 *
 * @param props - Rule identifier and styling props.
 */
export function CompactRuleCheckbox({
  ruleId,
  ruleTitle,
  className = ''
}: CompactRuleCheckboxProps) {
  const { isCompleted, toggleCompletion, isSaving } = useRuleProgress(ruleId)

  return (
    <Checkbox
      id={`compact-rule-${ruleId}`}
      checked={isCompleted}
      onCheckedChange={toggleCompletion}
      disabled={isSaving}
      className={`${className} ${isCompleted ? 'data-[state=checked]:border-success data-[state=checked]:bg-success data-[state=checked]:text-success-foreground' : ''}`}
      aria-label={`Mark "${ruleTitle}" as ${isCompleted ? 'incomplete' : 'complete'}`}
    />
  )
}
