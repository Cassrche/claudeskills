import { cn } from '@repo/utils'
import { isValidElement, type ReactNode } from 'react'

export interface PageHeroProps {
  title: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  className?: string
  maxWidth?: 'default' | 'narrow'
}

/**
 * Renders a shared page hero while preserving page-specific actions and extra content.
 */
export function PageHero({
  title,
  description,
  eyebrow,
  actions,
  children,
  className,
  maxWidth = 'default'
}: PageHeroProps) {
  const titleContent = isValidElement(title) ? (
    title
  ) : (
    <h1 className="font-medium text-6xl text-foreground tracking-tight">{title}</h1>
  )

  const descriptionContent = isValidElement(description) ? (
    description
  ) : description ? (
    <p className="mt-4 max-w-2xl text-foreground-muted text-lg leading-relaxed sm:mt-6">
      {description}
    </p>
  ) : null

  return (
    <header
      className={cn(
        'mb-12 sm:mb-16 lg:mb-10',
        maxWidth === 'narrow' ? 'max-w-3xl' : null,
        className
      )}
    >
      {eyebrow ? <div className="mb-4">{eyebrow}</div> : null}

      <div className={cn(actions ? 'flex items-start justify-between gap-4' : null)}>
        <div className="min-w-0">{titleContent}</div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      {descriptionContent}
      {children ? <div className="mt-6 sm:mt-8">{children}</div> : null}
    </header>
  )
}
