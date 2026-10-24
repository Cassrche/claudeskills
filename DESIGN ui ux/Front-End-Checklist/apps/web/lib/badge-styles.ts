export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low'
export type ChecklistDifficultyLevel = 'beginner' | 'intermediate' | 'advanced'

export const priorityBadgeStyles: Record<
  PriorityLevel,
  {
    label: string
    dot: string
    surface: string
  }
> = {
  critical: {
    label: 'Critical',
    dot: 'bg-red-600 dark:bg-red-400',
    surface: 'border-priority-critical-border bg-priority-critical-bg text-priority-critical-text'
  },
  high: {
    label: 'High',
    dot: 'bg-orange-600 dark:bg-orange-400',
    surface: 'border-priority-high-border bg-priority-high-bg text-priority-high-text'
  },
  medium: {
    label: 'Medium',
    dot: 'bg-amber-600 dark:bg-amber-400',
    surface: 'border-priority-medium-border bg-priority-medium-bg text-priority-medium-text'
  },
  low: {
    label: 'Low',
    dot: 'bg-emerald-600 dark:bg-emerald-400',
    surface: 'border-priority-low-border bg-priority-low-bg text-priority-low-text'
  }
}

export const categoryBadgeStyles: Record<string, string> = {
  html: 'border-category-html-border bg-category-html-bg text-category-html-text',
  css: 'border-category-css-border bg-category-css-bg text-category-css-text',
  javascript:
    'border-category-javascript-border bg-category-javascript-bg text-category-javascript-text',
  performance:
    'border-category-performance-border bg-category-performance-bg text-category-performance-text',
  accessibility:
    'border-category-accessibility-border bg-category-accessibility-bg text-category-accessibility-text',
  seo: 'border-category-seo-border bg-category-seo-bg text-category-seo-text',
  images: 'border-category-images-border bg-category-images-bg text-category-images-text',
  security: 'border-category-security-border bg-category-security-bg text-category-security-text',
  testing: 'border-category-testing-border bg-category-testing-bg text-category-testing-text',
  general: 'border-border bg-background-muted text-foreground-muted'
}

export const checklistDifficultyBadgeStyles = {
  beginner: {
    label: 'Beginner',
    dot: 'bg-emerald-600 dark:bg-emerald-400',
    surface: 'border-priority-low-border bg-priority-low-bg text-priority-low-text'
  },
  intermediate: {
    label: 'Intermediate',
    dot: 'bg-amber-600 dark:bg-amber-400',
    surface: 'border-priority-medium-border bg-priority-medium-bg text-priority-medium-text'
  },
  advanced: {
    label: 'Advanced',
    dot: 'bg-orange-600 dark:bg-orange-400',
    surface: 'border-priority-high-border bg-priority-high-bg text-priority-high-text'
  }
} as const
