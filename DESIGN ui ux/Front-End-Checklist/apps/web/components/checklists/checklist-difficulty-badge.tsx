import { cn } from '@repo/utils'
import { type ChecklistDifficultyLevel, checklistDifficultyBadgeStyles } from '@/lib/badge-styles'

interface ChecklistDifficultyBadgeProps {
  difficulty: ChecklistDifficultyLevel
  className?: string
}

/** Render checklist difficulty with the same badge treatment used in rule rows. */
export function ChecklistDifficultyBadge({ difficulty, className }: ChecklistDifficultyBadgeProps) {
  const config = checklistDifficultyBadgeStyles[difficulty]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1',
        'font-semibold text-[11px] uppercase tracking-[0.18em]',
        config.surface,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  )
}
