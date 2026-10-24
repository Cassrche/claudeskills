import { cn } from '@repo/utils'
import type { InputHTMLAttributes } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

/** Renders a styled text input with focus ring and disabled state support. */
function Input({ className, type, ...props }: InputProps) {
  return (
    <input
      data-slot="input"
      type={type}
      className={cn(
        'flex h-9 w-full rounded-md px-3 py-2 text-sm',
        'border border-input-border bg-input text-foreground',
        'placeholder:text-foreground-subtle',
        'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring',
        'file:border-0 file:bg-transparent file:font-medium file:text-sm',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'transition-colors duration-150',
        className
      )}
      {...props}
    />
  )
}

export { Input }
