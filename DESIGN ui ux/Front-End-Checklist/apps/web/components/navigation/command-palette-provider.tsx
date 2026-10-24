'use client'

import { routeRule, routeRules, routeRulesCategory } from '@repo/config'
import { Badge } from '@repo/design-system/ui/badge'
import { Command } from 'cmdk'
import Fuse from 'fuse.js'
import { useRouter } from 'next/navigation'
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'

interface Rule {
  id: string
  title: string
  description?: string
  slug: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  primaryCategory: string
  language: string
}

interface CommandPaletteContextType {
  isOpen: boolean
  openPalette: () => void
  closePalette: () => void
}

const CommandPaletteContext = createContext<CommandPaletteContextType | null>(null)

/** Provides access to the command palette open/close state and actions. */
export function useCommandPalette() {
  const context = useContext(CommandPaletteContext)
  if (!context) {
    throw new Error('useCommandPalette must be used within CommandPaletteProvider')
  }
  return context
}

interface CommandPaletteProviderProps {
  children: ReactNode
  rules: Rule[]
}

// Map priority to Badge variants
const priorityVariants = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low'
} as const

/** Provides command palette context and renders the palette UI with fuzzy search. */
export function CommandPaletteProvider({ children, rules }: CommandPaletteProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const router = useRouter()

  /** Opens the command palette. */
  const openPalette = () => setIsOpen(true)
  /** Closes the command palette and resets the search query. */
  const closePalette = () => {
    setIsOpen(false)
    setSearch('')
  }

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
    if (!search) return rules.slice(0, 8)
    return fuse
      .search(search)
      .slice(0, 8)
      .map(r => r.item)
  }, [search, rules, fuse])

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    /** Toggles the palette on Cmd/Ctrl+K and closes on Escape. */
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsOpen(open => !open)
      }
      if (e.key === 'Escape' && isOpen) {
        closePalette()
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [isOpen])

  /** Closes the palette and navigates to the selected rule's detail page. */
  const navigateToRule = (rule: Rule) => {
    closePalette()
    router.push(routeRule(rule.primaryCategory, rule.slug))
  }

  /** Closes the palette and navigates to the selected category page. */
  const navigateToCategory = (category: string) => {
    closePalette()
    router.push(routeRulesCategory(category))
  }

  // Get unique categories
  const categories = useMemo(() => {
    return Array.from(new Set(rules.map(r => r.primaryCategory))).sort()
  }, [rules])

  return (
    <CommandPaletteContext.Provider value={{ isOpen, openPalette, closePalette }}>
      {children}

      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closePalette}
            aria-hidden="true"
          />

          {/* Command Dialog */}
          <div className="fixed top-[20%] left-1/2 z-50 w-full max-w-lg -translate-x-1/2 px-4">
            <Command
              className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
              loop
            >
              <Command.Input
                value={search}
                onValueChange={setSearch}
                placeholder="Search rules, categories..."
                className="w-full border-border border-b bg-transparent px-4 py-3 text-foreground text-lg outline-none placeholder:text-foreground-muted"
                autoFocus
              />
              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="py-6 text-center text-foreground-muted text-sm">
                  No results found.
                </Command.Empty>

                {/* Categories */}
                {!search && (
                  <Command.Group
                    heading="Categories"
                    className="px-2 py-1.5 font-medium text-foreground-muted text-xs"
                  >
                    {categories.slice(0, 5).map(category => (
                      <Command.Item
                        key={`category-${category}`}
                        value={`category ${category}`}
                        onSelect={() => navigateToCategory(category)}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-foreground text-sm hover:bg-background-subtle aria-selected:bg-background-subtle"
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-accent/10 font-medium text-accent text-xs">
                          {category.charAt(0).toUpperCase()}
                        </span>
                        <span className="capitalize">{category}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Rules */}
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
                        <span className="block truncate font-medium text-foreground">
                          {rule.title}
                        </span>
                        <span className="block text-foreground-muted text-xs capitalize">
                          {rule.primaryCategory}
                        </span>
                      </div>
                      <Badge
                        variant={priorityVariants[rule.priority]}
                        className="shrink-0 text-[10px] capitalize"
                      >
                        {rule.priority}
                      </Badge>
                    </Command.Item>
                  ))}
                </Command.Group>

                {/* Quick Actions */}
                <Command.Group
                  heading="Quick Actions"
                  className="mt-2 px-2 py-1.5 font-medium text-foreground-muted text-xs"
                >
                  <Command.Item
                    value="all rules browse"
                    onSelect={() => {
                      closePalette()
                      router.push(routeRules())
                    }}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-foreground text-sm hover:bg-background-subtle aria-selected:bg-background-subtle"
                  >
                    Browse all rules
                  </Command.Item>
                </Command.Group>
              </Command.List>

              {/* Footer */}
              <div className="flex items-center justify-between border-border border-t px-4 py-2 text-foreground-muted text-xs">
                <span>Type to search</span>
                <div className="flex gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="rounded bg-background-subtle px-1 py-0.5 text-[10px] text-foreground-subtle">
                      ↑↓
                    </kbd>
                    navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded bg-background-subtle px-1 py-0.5 text-[10px] text-foreground-subtle">
                      ↵
                    </kbd>
                    select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded bg-background-subtle px-1 py-0.5 text-[10px] text-foreground-subtle">
                      esc
                    </kbd>
                    close
                  </span>
                </div>
              </div>
            </Command>
          </div>
        </div>
      )}
    </CommandPaletteContext.Provider>
  )
}
