'use client'

import type { ChecklistFramework } from '@repo/types'
import { cn } from '@repo/utils'
import type { RefObject } from 'react'
import { ChecklistFrameworkSelect } from './checklist-framework-select'

interface CreateChecklistFormProps {
  inputRef: RefObject<HTMLInputElement | null>
  name: string
  description: string
  framework: ChecklistFramework | ''
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onFrameworkChange: (value: ChecklistFramework | '') => void
  onSubmit: (event: React.FormEvent) => void
  onCancel: () => void
}

/**
 * Render the create-checklist form shown on the checklist index page.
 *
 * @param props - Form state and handlers.
 * @returns Checklist creation form.
 */
export function CreateChecklistForm({
  inputRef,
  name,
  description,
  framework,
  onNameChange,
  onDescriptionChange,
  onFrameworkChange,
  onSubmit,
  onCancel
}: CreateChecklistFormProps) {
  return (
    <div className="mb-8 rounded-lg border border-border bg-card p-4">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1 block font-medium text-foreground text-sm">
            Name
          </label>
          <input
            ref={inputRef}
            id="name"
            type="text"
            value={name}
            onChange={event => onNameChange(event.target.value)}
            placeholder="e.g., My Launch Checklist"
            className={cn(
              'w-full rounded-lg px-3 py-2',
              'border border-border bg-background',
              'text-foreground text-sm',
              'placeholder:text-foreground-muted',
              'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50'
            )}
            autoComplete="off"
          />
        </div>

        <ChecklistFrameworkSelect
          id="framework"
          label="Framework (optional)"
          value={framework}
          onChange={onFrameworkChange}
          helperText="Rule pages opened from this checklist will prioritize that framework tab."
        />

        <div>
          <label htmlFor="description" className="mb-1 block font-medium text-foreground text-sm">
            Description (optional)
          </label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={event => onDescriptionChange(event.target.value)}
            placeholder="What is this checklist for?"
            className={cn(
              'w-full rounded-lg px-3 py-2',
              'border border-border bg-background',
              'text-foreground text-sm',
              'placeholder:text-foreground-muted',
              'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50'
            )}
            autoComplete="off"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!name.trim()}
            className={cn(
              'rounded-lg px-4 py-2',
              'bg-accent text-accent-foreground',
              'transition-colors hover:bg-accent/90',
              'font-medium text-sm',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            Create Checklist
          </button>
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              'rounded-lg px-4 py-2',
              'text-foreground-muted hover:text-foreground',
              'transition-colors hover:bg-background-subtle',
              'font-medium text-sm'
            )}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
