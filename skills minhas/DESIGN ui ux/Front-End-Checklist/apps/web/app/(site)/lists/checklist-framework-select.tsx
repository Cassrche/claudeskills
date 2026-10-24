'use client'

import { isChecklistFramework } from '@repo/config'
import type { ChecklistFramework } from '@repo/types'
import { cn } from '@repo/utils'
import { CHECKLIST_FRAMEWORK_OPTIONS } from '@/lib/framework-preferences'

interface ChecklistFrameworkSelectProps {
  id: string
  label: string
  value: ChecklistFramework | ''
  onChange: (value: ChecklistFramework | '') => void
  helperText?: string
}

/**
 * Render the shared checklist framework selector used by create/edit flows.
 *
 * @param props - Framework field props.
 * @returns Framework select input with optional helper copy.
 */
export function ChecklistFrameworkSelect({
  id,
  label,
  value,
  onChange,
  helperText
}: ChecklistFrameworkSelectProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-medium text-foreground text-sm">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={event => onChange(getFrameworkValue(event.target.value))}
        className={cn(
          'w-full rounded-lg px-3 py-2',
          'border border-border bg-background',
          'text-foreground text-sm',
          'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50'
        )}
      >
        <option value="">No preferred framework</option>
        {CHECKLIST_FRAMEWORK_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText ? <p className="mt-1 text-foreground-muted text-xs">{helperText}</p> : null}
    </div>
  )
}

/**
 * Normalize raw select values into the supported checklist-framework union.
 *
 * @param value - Raw select element value.
 * @returns Supported framework or an empty selection.
 */
function getFrameworkValue(value: string): ChecklistFramework | '' {
  return isChecklistFramework(value) ? value : ''
}
