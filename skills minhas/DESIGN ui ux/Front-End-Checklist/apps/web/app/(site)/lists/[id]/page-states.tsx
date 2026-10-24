'use client'

import { routeHome, routeLists } from '@repo/config'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@repo/design-system/custom/navigation/breadcrumb'
import { ArrowLeft, ListChecks } from '@repo/design-system/icons'
import { cn } from '@repo/utils'
import Link from 'next/link'
import { RuleRowSkeleton } from '@/components/rules/listing/rule-row'

/**
 * Render the loading skeleton for the checklist detail page.
 *
 * @returns A checklist detail loading state.
 */
export function PageSkeleton() {
  return (
    <div className="container-content py-8">
      <div className="animate-pulse space-y-6">
        <div className="h-4 w-48 rounded bg-background-muted" />
        <div className="h-8 w-64 rounded bg-background-muted" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <RuleRowSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Render the empty state shown when a saved checklist cannot be found.
 *
 */
export function ChecklistNotFoundState() {
  return (
    <div className="container-content py-8">
      <div className="py-16 text-center">
        <ListChecks className="mx-auto mb-4 h-12 w-12 text-foreground-muted" />
        <h2 className="mb-2 font-medium text-foreground text-lg">Checklist not found</h2>
        <p className="mb-4 text-foreground-muted">
          This checklist may have been deleted or doesn&apos;t exist.
        </p>
        <Link
          href={routeLists()}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg px-4 py-2',
            'bg-accent text-accent-foreground',
            'transition-colors hover:bg-accent/90',
            'font-medium text-sm'
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Lists
        </Link>
      </div>
    </div>
  )
}

interface ChecklistBreadcrumbsProps {
  checklistName: string
}

/**
 * Render breadcrumbs for the checklist detail page.
 *
 */
export function ChecklistBreadcrumbs({ checklistName }: ChecklistBreadcrumbsProps) {
  return (
    <Breadcrumb className="mb-4 sm:mb-6">
      <BreadcrumbList className="text-[13px]">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={routeHome()}>Home</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={routeLists()}>Lists</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{checklistName}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
