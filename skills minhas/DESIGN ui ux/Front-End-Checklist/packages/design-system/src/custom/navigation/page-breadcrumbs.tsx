import {
  Breadcrumb,
  BreadcrumbItem,
  type BreadcrumbItemData,
  BreadcrumbJsonLd,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@repo/design-system/custom/navigation/breadcrumb'
import { cn } from '@repo/utils'
import { Fragment } from 'react'

export interface PageBreadcrumbsProps {
  items: BreadcrumbItemData[]
  baseUrl?: string
  includeJsonLd?: boolean
  className?: string
}

/** Render a standard breadcrumb trail with optional JSON-LD output. */
export function PageBreadcrumbs({
  items,
  baseUrl,
  includeJsonLd = false,
  className
}: PageBreadcrumbsProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <>
      {includeJsonLd && baseUrl ? <BreadcrumbJsonLd items={items} baseUrl={baseUrl} /> : null}

      <Breadcrumb className={cn('mb-6 sm:mb-8', className)}>
        <BreadcrumbList className="text-[13px]">
          {items.map((item, index) => {
            const isLast = index === items.length - 1

            return (
              <Fragment key={`${item.label}-${item.href ?? index}`}>
                <BreadcrumbItem>
                  {isLast || !item.href ? (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast ? <BreadcrumbSeparator /> : null}
              </Fragment>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </>
  )
}
