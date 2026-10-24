export interface BrowserRule {
  id: string
  title: string
  description?: string
  slug: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  primaryCategory: string
  categories: string[]
  subcategory?: string | null
  language: string
}

export interface RulesBrowserProps {
  rules: BrowserRule[]
  showCategoryFilter?: boolean
  groupByCategory?: boolean
  groupBySubcategory?: boolean
  currentCategory?: string
  subcategoryDescriptions?: Record<string, string>
  enableCategoryLinks?: boolean
}

export type SubcategoryGroups = {
  uncategorized: BrowserRule[]
  groups: Record<string, BrowserRule[]>
}
export type CategoryGroups = Record<string, SubcategoryGroups>

export type GroupedRules =
  | { type: 'category'; categoryGroups: CategoryGroups }
  | { type: 'subcategory'; uncategorized: BrowserRule[]; groups: Record<string, BrowserRule[]> }
