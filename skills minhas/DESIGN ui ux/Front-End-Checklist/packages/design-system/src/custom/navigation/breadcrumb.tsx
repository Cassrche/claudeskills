import { Slot } from '@radix-ui/react-slot'
import { ChevronRight, MoreHorizontal } from '@repo/design-system/icons'
import { cn } from '@repo/utils'
import type { ComponentProps, ReactNode } from 'react'
import { forwardRef } from 'react'

const Breadcrumb = forwardRef<
  HTMLElement,
  ComponentProps<'nav'> & {
    separator?: ReactNode
  }
>(({ ...props }, ref) => (
  <nav ref={ref} aria-label="Breadcrumb" data-slot="breadcrumb" {...props} />
))
Breadcrumb.displayName = 'Breadcrumb'

const BreadcrumbList = forwardRef<HTMLOListElement, ComponentProps<'ol'>>(
  ({ className, ...props }, ref) => (
    <ol
      ref={ref}
      data-slot="breadcrumb-list"
      className={cn(
        'wrap-break-word flex flex-wrap items-center gap-1.5 text-foreground-muted text-sm',
        className
      )}
      {...props}
    />
  )
)
BreadcrumbList.displayName = 'BreadcrumbList'

const BreadcrumbItem = forwardRef<HTMLLIElement, ComponentProps<'li'>>(
  ({ className, ...props }, ref) => (
    <li
      ref={ref}
      data-slot="breadcrumb-item"
      className={cn('inline-flex items-center gap-1.5', className)}
      {...props}
    />
  )
)
BreadcrumbItem.displayName = 'BreadcrumbItem'

const BreadcrumbLink = forwardRef<
  HTMLAnchorElement,
  ComponentProps<'a'> & {
    asChild?: boolean
  }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'a'

  return (
    <Comp
      ref={ref}
      data-slot="breadcrumb-link"
      className={cn(
        'rounded-sm transition-colors hover:text-foreground focus:text-foreground',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
      {...props}
    />
  )
})
BreadcrumbLink.displayName = 'BreadcrumbLink'

const BreadcrumbPage = forwardRef<HTMLSpanElement, ComponentProps<'span'>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn('font-medium text-foreground', className)}
      {...props}
    />
  )
)
BreadcrumbPage.displayName = 'BreadcrumbPage'

/** Render the visual separator between breadcrumb items. */
function BreadcrumbSeparator({ children, className, ...props }: ComponentProps<'li'>) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn('[&>svg]:h-3.5 [&>svg]:w-3.5', className)}
      {...props}
    >
      {children ?? <ChevronRight />}
    </li>
  )
}
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator'

/** Render an overflow marker for collapsed breadcrumb paths. */
function BreadcrumbEllipsis({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      className={cn('flex h-9 w-9 items-center justify-center', className)}
      {...props}
    >
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">More</span>
    </span>
  )
}
BreadcrumbEllipsis.displayName = 'BreadcrumbEllipsis'

export interface BreadcrumbItemData {
  label: string
  href?: string
}

/** Generate breadcrumb JSON-LD structured data for SEO consumers. */
export function generateBreadcrumbJsonLd(
  items: BreadcrumbItemData[],
  baseUrl: string
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.href && {
        item: item.href.startsWith('http') ? item.href : `${baseUrl}${item.href}`
      })
    }))
  }
}

/** Render breadcrumb JSON-LD into the document for crawlers. */
function BreadcrumbJsonLd({ items, baseUrl }: { items: BreadcrumbItemData[]; baseUrl: string }) {
  const jsonLd = generateBreadcrumbJsonLd(items, baseUrl)

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbJsonLd,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
}
