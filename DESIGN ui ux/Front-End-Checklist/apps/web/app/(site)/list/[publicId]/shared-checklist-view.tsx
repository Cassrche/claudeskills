'use client'

import { authClient } from '@repo/auth/auth-client'
import {
  routeHome,
  routeLists,
  routeRule,
  routeRules,
  routeSharedChecklist,
  SITE_URL
} from '@repo/config'
import { PageBreadcrumbs } from '@repo/design-system/custom/navigation/page-breadcrumbs'
import { Check, Copy, ListChecks } from '@repo/design-system/icons'
import type { ChecklistFramework } from '@repo/types'
import { cn } from '@repo/utils'
import { useCallback, useState } from 'react'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { RuleRow } from '@/components/rules/listing/rule-row'
import { useUserChecklists } from '@/hooks/use-user-checklists'
import {
  buildRuleHrefWithFrameworkContext,
  getChecklistFrameworkLabel
} from '@/lib/framework-preferences'
import { TELEMETRY_EVENTS } from '@/lib/telemetry-events'
import { trackInteraction } from '@/lib/telemetry-interactions'

interface RuleItem {
  id: string
  title: string
  description?: string
  slug: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  primaryCategory: string
  categories: string[]
  subcategory?: string | null
}

interface SharedChecklistViewProps {
  publicId: string
  name: string
  description?: string
  framework?: ChecklistFramework
  rules: RuleItem[]
}

/**
 * Read-only shared checklist view with share and clone actions.
 */
export function SharedChecklistView({
  publicId,
  name,
  description,
  framework,
  rules
}: SharedChecklistViewProps) {
  const { data: session } = authClient.useSession()
  const { createChecklist } = useUserChecklists()
  const [copied, setCopied] = useState(false)
  const [cloneDone, setCloneDone] = useState(false)

  const shareUrl = `${SITE_URL}${routeSharedChecklist(publicId)}`

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      trackInteraction(TELEMETRY_EVENTS.copyActionCompleted, {
        label: 'copy_shared_checklist_link',
        location: 'shared_checklist',
        target: shareUrl
      })
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }, [shareUrl])

  const handleClone = useCallback(async () => {
    if (!session?.user?.id) return
    const ruleIds = rules.map(r => r.id)
    trackInteraction(TELEMETRY_EVENTS.ctaClicked, {
      label: 'clone_shared_checklist',
      location: 'shared_checklist',
      target: publicId
    })
    await createChecklist(name, description, ruleIds, framework)
    setCloneDone(true)
  }, [session?.user?.id, name, description, rules, createChecklist, framework, publicId])

  const frameworkLabel = getChecklistFrameworkLabel(framework)

  return (
    <div className="container-content py-12 sm:py-16 lg:pt-5 lg:pb-20">
      <PageBreadcrumbs
        items={[{ label: 'Home', href: routeHome() }, { label: 'Shared checklist' }]}
      />

      <header className="mb-6 sm:mb-8">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
              <ListChecks className="h-5 w-5 text-accent" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground text-xl tracking-tight">{name}</h1>
              {description && <p className="mt-1 text-foreground-muted text-sm">{description}</p>}
              {frameworkLabel && (
                <p className="mt-2 text-foreground-muted text-xs uppercase tracking-[0.18em]">
                  Framework: {frameworkLabel}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-3 py-2',
                'border border-border bg-background',
                'font-medium text-foreground text-sm',
                'transition-colors hover:bg-background-subtle',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy link
                </>
              )}
            </button>
            {session?.user?.id ? (
              <button
                type="button"
                onClick={handleClone}
                disabled={cloneDone}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-3 py-2',
                  'bg-accent text-accent-foreground',
                  'font-medium text-sm',
                  'transition-colors hover:bg-accent-hover',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                {cloneDone ? 'Added to Lists' : 'Clone to My Lists'}
              </button>
            ) : (
              <TrackedLink
                href={routeLists()}
                telemetryEvent={TELEMETRY_EVENTS.ctaClicked}
                telemetryProperties={{
                  label: 'sign_in_to_clone',
                  location: 'shared_checklist',
                  target: routeLists()
                }}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-3 py-2',
                  'bg-accent text-accent-foreground',
                  'font-medium text-sm',
                  'transition-colors hover:bg-accent-hover',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                )}
              >
                Sign in to clone
              </TrackedLink>
            )}
          </div>
        </div>

        <p className="text-foreground-muted text-sm">{rules.length} rules</p>
      </header>

      {rules.length === 0 ? (
        <div className="border-border border-t py-16 text-center">
          <p className="mb-4 text-foreground-muted">This checklist has no rules yet.</p>
          <TrackedLink
            href={routeRules()}
            telemetryEvent={TELEMETRY_EVENTS.ctaClicked}
            telemetryProperties={{
              label: 'browse_rules_empty_shared_checklist',
              location: 'shared_checklist'
            }}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2',
              'bg-accent text-accent-foreground',
              'font-medium text-sm hover:bg-accent/90'
            )}
          >
            Browse Rules
          </TrackedLink>
        </div>
      ) : (
        <ul className="list-none border-border-subtle border-t">
          {rules.map(rule => (
            <li key={rule.id}>
              <RuleRow
                id={rule.id}
                title={rule.title}
                description={rule.description}
                priority={rule.priority}
                categories={rule.categories}
                subcategory={rule.subcategory}
                href={buildRuleHrefWithFrameworkContext(
                  routeRule(rule.primaryCategory, rule.slug),
                  framework,
                  name
                )}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
