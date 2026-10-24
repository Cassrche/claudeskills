/** Shared sub-components used by RulesBrowserToolbar. */
'use client'

import { ChevronDown } from '@repo/design-system/icons'
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/design-system/ui/tooltip'
import { cn } from '@repo/utils'
import type { ReactNode } from 'react'

/** Toolbar icon button with tooltip. */
export function ToolbarButton({
  label,
  onClick,
  children
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            'flex h-9 items-center gap-2 rounded-md px-3',
            'text-foreground-muted text-sm',
            'hover:bg-foreground/10 hover:text-foreground',
            'transition-colors duration-150'
          )}
          aria-label={label}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

/** Styled select dropdown used in the filter panel. */
export function SelectFilter({
  id,
  value,
  onChange,
  active,
  defaultLabel,
  options
}: {
  id: string
  value: string
  onChange: (value: string) => void
  active: boolean
  defaultLabel: string
  options: { value: string; label: string }[]
}) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {id}
      </label>
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cn(
          'h-10 appearance-none rounded-md pr-8 pl-3',
          'border border-foreground/30 bg-transparent',
          'text-foreground-muted text-sm',
          'focus:border-foreground/50 focus:outline-none',
          'cursor-pointer transition-colors duration-150',
          active && 'border-foreground/50 text-foreground'
        )}
      >
        {defaultLabel ? <option value="all">{defaultLabel}</option> : null}
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
    </div>
  )
}
