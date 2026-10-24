import { cn } from '@repo/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-1 font-medium text-xs transition-colors',
  {
    variants: {
      variant: {
        default: 'border-foreground bg-foreground text-background',
        secondary: 'border-border bg-background-subtle text-foreground-muted',
        outline: 'border-border bg-transparent text-foreground-muted',
        destructive: 'border-destructive bg-destructive text-destructive-foreground',
        critical:
          'border-priority-critical-border bg-priority-critical-bg text-priority-critical-text',
        high: 'border-priority-high-border bg-priority-high-bg text-priority-high-text',
        medium: 'border-priority-medium-border bg-priority-medium-bg text-priority-medium-text',
        low: 'border-priority-low-border bg-priority-low-bg text-priority-low-text',
        success: 'border-priority-low-border bg-priority-low-bg text-priority-low-text',
        warning: 'border-priority-medium-border bg-priority-medium-bg text-priority-medium-text',
        error: 'border-priority-critical-border bg-priority-critical-bg text-priority-critical-text'
      },
      size: {
        default: 'px-2.5 py-1 text-xs',
        sm: 'px-2 py-0.5 text-[11px]',
        lg: 'px-3 py-1.5 text-sm'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

/** Renders a styled inline badge with variant and size options. */
function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
