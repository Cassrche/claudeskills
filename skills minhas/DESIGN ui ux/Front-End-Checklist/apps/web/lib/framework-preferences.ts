import { isChecklistFramework } from '@repo/config'
import type { ChecklistFramework } from '@repo/types'

export const FRAMEWORK_QUERY_PARAM = 'framework'
export const CHECKLIST_NAME_QUERY_PARAM = 'fromChecklist'
export const FRAMEWORK_STORAGE_KEY = 'preferred-framework'
export const FRAMEWORK_PREFERENCE_EVENT = 'preferred-framework-change'

export const CHECKLIST_FRAMEWORK_OPTIONS: Array<{
  value: ChecklistFramework
  label: string
  description: string
}> = [
  {
    value: 'vite',
    label: 'Vite',
    description: 'Frontend apps built with Vite or Vite-powered React stacks.'
  },
  {
    value: 'nextjs',
    label: 'Next.js',
    description: 'Server-rendered or hybrid React apps using Next.js.'
  },
  {
    value: 'astro',
    label: 'Astro',
    description: 'Content-heavy or hybrid sites using Astro pages, islands, and endpoints.'
  },
  {
    value: 'sveltekit',
    label: 'SvelteKit',
    description: 'Svelte apps using SvelteKit routing, rendering, and server endpoints.'
  },
  {
    value: 'react',
    label: 'React',
    description: 'Client-rendered React apps without Next.js-specific patterns.'
  }
]

type FrameworkSelectionSource = 'checklist' | 'hash' | 'stored' | 'default'

interface TabDescriptor {
  value: string
  label: string
}

interface FrameworkTabSelection {
  activeTab: string
  source: FrameworkSelectionSource
  checklistName?: string
}

/**
 * Check whether a value is one of the supported checklist framework identifiers.
 *
 * @param value - Unknown framework value.
 * @returns True when the value is supported by checklist UI and storage.
 */
/**
 * Convert a framework identifier into the UI label shown to users.
 *
 * @param framework - Stored checklist framework identifier.
 * @returns Human-readable label or null when not set.
 */
export function getChecklistFrameworkLabel(framework?: ChecklistFramework): string | null {
  const option = CHECKLIST_FRAMEWORK_OPTIONS.find(item => item.value === framework)
  return option?.label ?? null
}

/**
 * Build a rule href that preserves checklist framework context in the URL.
 *
 * @param href - Existing rule detail href.
 * @param framework - Checklist framework selection.
 * @param checklistName - Optional checklist name for the inline context badge.
 * @returns Rule href with stable query params for the framework context.
 */
export function buildRuleHrefWithFrameworkContext(
  href: string,
  framework?: ChecklistFramework,
  checklistName?: string
): string {
  if (!framework) {
    return href
  }

  const url = new URL(href, 'https://frontendchecklist.io')
  url.searchParams.set(FRAMEWORK_QUERY_PARAM, framework)

  if (checklistName) {
    url.searchParams.set(CHECKLIST_NAME_QUERY_PARAM, checklistName)
  }

  return `${url.pathname}${url.search}${url.hash}`
}

/**
 * Read the saved global framework preference from localStorage.
 *
 * @returns Stored framework or null when missing/unsupported.
 */
export function getStoredFrameworkPreference(): ChecklistFramework | null {
  if (typeof window === 'undefined') {
    return null
  }

  const stored = window.localStorage.getItem(FRAMEWORK_STORAGE_KEY)
  return isChecklistFramework(stored) ? stored : null
}

/**
 * Persist the user's global framework preference and notify active tabs.
 *
 * @param framework - Framework to persist globally.
 */
export function setStoredFrameworkPreference(framework: ChecklistFramework): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(FRAMEWORK_STORAGE_KEY, framework)
  window.dispatchEvent(new Event(FRAMEWORK_PREFERENCE_EVENT))
}

/**
 * Resolve which tab should be active given checklist context, URL, and storage.
 *
 * @param tabs - Available tab descriptors for the current rule.
 * @param defaultTab - Rule-authored default.
 * @returns Active tab plus the selection source.
 */
export function resolveFrameworkTabSelection(
  tabs: TabDescriptor[],
  defaultTab?: string
): FrameworkTabSelection {
  const fallback = defaultTab || tabs[0]?.value || ''

  if (typeof window === 'undefined') {
    return { activeTab: fallback, source: 'default' }
  }

  const searchParams = new URLSearchParams(window.location.search)
  const contextualFramework = searchParams.get(FRAMEWORK_QUERY_PARAM)
  const checklistName = searchParams.get(CHECKLIST_NAME_QUERY_PARAM) ?? undefined
  const hasChecklistContext = Boolean(
    contextualFramework && tabs.some(tab => tab.value === contextualFramework)
  )

  const hash = window.location.hash.slice(1)
  if (hash && tabs.some(tab => tab.value === hash)) {
    return {
      activeTab: hash,
      source: 'hash',
      checklistName: hasChecklistContext ? checklistName : undefined
    }
  }

  if (hasChecklistContext && contextualFramework) {
    return {
      activeTab: contextualFramework,
      source: 'checklist',
      checklistName
    }
  }

  const stored = getStoredFrameworkPreference()
  if (stored && tabs.some(tab => tab.value === stored)) {
    return { activeTab: stored, source: 'stored' }
  }

  return { activeTab: fallback, source: 'default' }
}
