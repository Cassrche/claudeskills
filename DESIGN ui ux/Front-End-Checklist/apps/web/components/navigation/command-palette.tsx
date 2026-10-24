'use client'

import { routeRule, routeRules, routeRulesCategory } from '@repo/config'
import { Command } from 'cmdk'
import Fuse from 'fuse.js'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

interface Rule {
  id: string
  title: string
  description?: string
  slug: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  primaryCategory: string
  language: string
}

interface CommandPaletteProps {
  rules: Rule[]
}

/** Standalone command palette with fuzzy search for rules and categories. */
export function CommandPalette({ rules }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const router = useRouter()

  // Set up Fuse.js for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(rules, {
      keys: ['title', 'description', 'primaryCategory'],
      threshold: 0.3,
      includeScore: true
    })
  }, [rules])

  // Filter rules based on search
  const filteredRules = useMemo(() => {
    if (!search) return rules.slice(0, 10)
    return fuse
      .search(search)
      .slice(0, 10)
      .map(r => r.item)
  }, [search, rules, fuse])

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    /** Toggles the palette on Cmd/Ctrl+K. */
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(open => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  /** Closes the palette and navigates to the selected rule's detail page. */
  const navigateToRule = (rule: Rule) => {
    setOpen(false)
    router.push(routeRule(rule.primaryCategory, rule.slug))
  }

  /** Closes the palette and navigates to the selected category page. */
  const navigateToCategory = (category: string) => {
    setOpen(false)
    router.push(routeRulesCategory(category))
  }

  // Get unique categories
  const categories = useMemo(() => {
    return Array.from(new Set(rules.map(r => r.primaryCategory))).sort()
  }, [rules])

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!search) return categories.slice(0, 5)
    const searchLower = search.toLowerCase()
    return categories.filter(cat => cat.toLowerCase().includes(searchLower)).slice(0, 5)
  }, [search, categories])

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-foreground-muted text-sm shadow-lg transition-colors hover:bg-background-subtle sm:hidden"
        aria-label="Open command palette"
      >
        <span>Search</span>
        <kbd className="rounded bg-background-muted px-1.5 py-0.5 text-xs">⌘K</kbd>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Command Dialog */}
      <div className="fixed top-1/4 left-1/2 z-50 w-full max-w-lg -translate-x-1/2">
        <Command
          className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
          loop
          shouldFilter={false}
        >
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Search rules, categories..."
            className="w-full border-border border-b bg-transparent px-4 py-3 text-lg outline-none placeholder:text-foreground-subtle"
            autoFocus
          />
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-foreground-muted text-sm">
              No results found.
            </Command.Empty>

            {/* Categories */}
            {filteredCategories.length > 0 && (
              <Command.Group
                heading="Categories"
                className="px-2 py-1.5 font-medium text-foreground-muted text-xs"
              >
                {filteredCategories.map(category => (
                  <Command.Item
                    key={`category-${category}`}
                    value={`category ${category}`}
                    onSelect={() => navigateToCategory(category)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-background-subtle aria-selected:bg-background-subtle"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-background-muted text-xs">
                      {category.charAt(0).toUpperCase()}
                    </span>
                    <span className="capitalize">{category}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Rules */}
            {filteredRules.length > 0 && (
              <Command.Group
                heading="Rules"
                className="mt-2 px-2 py-1.5 font-medium text-foreground-muted text-xs"
              >
                {filteredRules.map(rule => (
                  <Command.Item
                    key={rule.id}
                    value={`${rule.title} ${rule.primaryCategory}`}
                    onSelect={() => navigateToRule(rule)}
                    className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm hover:bg-background-subtle aria-selected:bg-background-subtle"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block truncate">{rule.title}</span>
                      <span className="block text-foreground-muted text-xs capitalize">
                        {rule.primaryCategory}
                      </span>
                    </div>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${getPriorityColor(rule.priority)}`}
                    >
                      {rule.priority}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Quick Actions */}
            <Command.Group
              heading="Quick Actions"
              className="mt-2 px-2 py-1.5 font-medium text-foreground-muted text-xs"
            >
              <Command.Item
                value="all rules"
                onSelect={() => {
                  setOpen(false)
                  router.push(routeRules())
                }}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-background-subtle aria-selected:bg-background-subtle"
              >
                Browse all rules
              </Command.Item>
            </Command.Group>
          </Command.List>

          {/* Footer */}
          <div className="flex items-center justify-between border-border border-t px-4 py-2 text-foreground-muted text-xs">
            <span>Type to search</span>
            <div className="flex gap-2">
              <span>↑↓ to navigate</span>
              <span>↵ to select</span>
              <span>esc to close</span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  )
}

/** Returns Tailwind classes for a priority level's background and text color. */
function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'critical':
      return 'bg-priority-critical-bg text-priority-critical-text'
    case 'high':
      return 'bg-priority-high-bg text-priority-high-text'
    case 'medium':
      return 'bg-priority-medium-bg text-priority-medium-text'
    case 'low':
      return 'bg-priority-low-bg text-priority-low-text'
    default:
      return 'bg-background-muted text-foreground-muted'
  }
}
