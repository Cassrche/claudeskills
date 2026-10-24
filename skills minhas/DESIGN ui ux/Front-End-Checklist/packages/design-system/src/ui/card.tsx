import { cn } from '@repo/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'

const cardVariants = cva('rounded-lg border text-card-foreground transition-all duration-150', {
  variants: {
    variant: {
      default: 'border-border bg-card',
      subtle: 'border-border bg-background-subtle',
      elevated: 'border-border bg-card shadow-sm'
    },
    emphasis: {
      default: '',
      accent: 'ring-1 ring-accent/20',
      success: 'ring-1 ring-success/25'
    },
    interactive: {
      true: 'hover:border-border-focus hover:shadow-md',
      false: ''
    }
  },
  defaultVariants: {
    variant: 'default',
    emphasis: 'default',
    interactive: false
  }
})

/** Container component for grouped content with a border and background. */
function Card({
  className,
  variant,
  emphasis,
  interactive,
  ...props
}: HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      className={cn(cardVariants({ variant, emphasis, interactive }), className)}
      {...props}
    />
  )
}

/** Top section of a Card, typically containing the title and description. */
function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-header"
      className={cn('flex flex-col space-y-1.5 p-5', className)}
      {...props}
    />
  )
}

/** Renders the card's heading text with an implicit heading role. */
function CardTitle({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-title"
      role="heading"
      aria-level={3}
      className={cn(
        'font-semibold text-base text-foreground leading-none tracking-tight',
        className
      )}
      {...props}
    />
  )
}

/** Renders secondary descriptive text within a CardHeader. */
function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="card-description"
      className={cn('text-[13px] text-foreground-muted', className)}
      {...props}
    />
  )
}

/** Main body area of a Card for primary content. */
function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="card-content" className={cn('p-5 pt-0', className)} {...props} />
}

/** Bottom section of a Card, typically containing actions or metadata. */
function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center p-5 pt-0', className)}
      {...props}
    />
  )
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, cardVariants }
