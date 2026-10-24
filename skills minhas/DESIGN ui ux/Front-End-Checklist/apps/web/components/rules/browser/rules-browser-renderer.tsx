'use client'

import { routeRule } from '@repo/config'
import { RuleRow } from '@/components/rules/listing/rule-row'
import { CategoryHeader, SubcategoryHeader } from './rules-browser-headers'
import type { BrowserRule, GroupedRules } from './rules-browser-types'

interface RulesBrowserRendererProps {
  groupedRules: GroupedRules | null
  filteredRules: BrowserRule[]
  currentCategory?: string
  subcategoryDescriptions: Record<string, string>
  expandedRules: Set<string>
  handleRuleExpandToggle: (ruleId: string, expanded: boolean) => void
  areAllExpanded: (ruleIds: string[]) => boolean
  handleExpandRules: (ruleIds: string[]) => void
  handleCollapseRules: (ruleIds: string[]) => void
  areAllChecked: (ruleIds: string[]) => boolean
  handleCheckRules: (ruleIds: string[]) => void
  handleUncheckRules: (ruleIds: string[]) => void
  enableCategoryLinks: boolean
}

/**
 * Render rules in grouped or flat layouts based on the browser state.
 * @param props - Renderer inputs for grouping, expansion, and bulk actions.
 */
export function RulesBrowserRenderer({
  groupedRules,
  filteredRules,
  currentCategory,
  subcategoryDescriptions,
  expandedRules,
  handleRuleExpandToggle,
  areAllExpanded,
  handleExpandRules,
  handleCollapseRules,
  areAllChecked,
  handleCheckRules,
  handleUncheckRules,
  enableCategoryLinks
}: RulesBrowserRendererProps) {
  if (!groupedRules) {
    return (
      <div>
        {filteredRules.map(rule => (
          <RuleRow
            key={rule.id}
            id={rule.id}
            title={rule.title}
            description={rule.description}
            priority={rule.priority}
            categories={rule.categories}
            subcategory={rule.subcategory}
            href={routeRule(rule.primaryCategory, rule.slug)}
            currentCategory={currentCategory}
            isExpanded={expandedRules.has(rule.id)}
            onExpandToggle={handleRuleExpandToggle}
          />
        ))}
      </div>
    )
  }

  if (groupedRules.type === 'category') {
    return (
      <>
        {Object.keys(groupedRules.categoryGroups)
          .sort()
          .map((category, categoryIndex) => {
            const group = groupedRules.categoryGroups[category]
            const subcategoryKeys = Object.keys(group.groups).sort()
            const hasUncategorized = group.uncategorized.length > 0

            return (
              <div key={category}>
                <CategoryHeader
                  category={category}
                  isFirst={categoryIndex === 0}
                  enableLink={enableCategoryLinks}
                />
                {hasUncategorized ? (
                  <RulesSection
                    label="General"
                    showHeader={subcategoryKeys.length > 0}
                    rules={group.uncategorized}
                    currentCategory={currentCategory}
                    description={subcategoryDescriptions.general}
                    isFirst
                    expandedRules={expandedRules}
                    handleRuleExpandToggle={handleRuleExpandToggle}
                    allExpanded={areAllExpanded(group.uncategorized.map(r => r.id))}
                    onExpandAll={() => handleExpandRules(group.uncategorized.map(r => r.id))}
                    onCollapseAll={() => handleCollapseRules(group.uncategorized.map(r => r.id))}
                    allChecked={areAllChecked(group.uncategorized.map(r => r.id))}
                    onCheckAll={() => handleCheckRules(group.uncategorized.map(r => r.id))}
                    onUncheckAll={() => handleUncheckRules(group.uncategorized.map(r => r.id))}
                  />
                ) : null}
                {subcategoryKeys.map((subcategory, subIndex) => (
                  <RulesSection
                    key={subcategory}
                    label={subcategory}
                    rules={group.groups[subcategory]}
                    currentCategory={currentCategory}
                    description={subcategoryDescriptions[subcategory]}
                    isFirst={!hasUncategorized && subIndex === 0}
                    expandedRules={expandedRules}
                    handleRuleExpandToggle={handleRuleExpandToggle}
                    allExpanded={areAllExpanded(group.groups[subcategory].map(r => r.id))}
                    onExpandAll={() => handleExpandRules(group.groups[subcategory].map(r => r.id))}
                    onCollapseAll={() =>
                      handleCollapseRules(group.groups[subcategory].map(r => r.id))
                    }
                    allChecked={areAllChecked(group.groups[subcategory].map(r => r.id))}
                    onCheckAll={() => handleCheckRules(group.groups[subcategory].map(r => r.id))}
                    onUncheckAll={() =>
                      handleUncheckRules(group.groups[subcategory].map(r => r.id))
                    }
                  />
                ))}
              </div>
            )
          })}
      </>
    )
  }

  const hasUncategorized = groupedRules.uncategorized.length > 0
  const subcategoryKeys = Object.keys(groupedRules.groups).sort()

  return (
    <>
      {hasUncategorized ? (
        <RulesSection
          label="General"
          rules={groupedRules.uncategorized}
          currentCategory={currentCategory}
          description={subcategoryDescriptions.general}
          isFirst
          expandedRules={expandedRules}
          handleRuleExpandToggle={handleRuleExpandToggle}
          allExpanded={areAllExpanded(groupedRules.uncategorized.map(r => r.id))}
          onExpandAll={() => handleExpandRules(groupedRules.uncategorized.map(r => r.id))}
          onCollapseAll={() => handleCollapseRules(groupedRules.uncategorized.map(r => r.id))}
          allChecked={areAllChecked(groupedRules.uncategorized.map(r => r.id))}
          onCheckAll={() => handleCheckRules(groupedRules.uncategorized.map(r => r.id))}
          onUncheckAll={() => handleUncheckRules(groupedRules.uncategorized.map(r => r.id))}
        />
      ) : null}
      {subcategoryKeys.map((subcategory, index) => (
        <RulesSection
          key={subcategory}
          label={subcategory}
          rules={groupedRules.groups[subcategory]}
          currentCategory={currentCategory}
          description={subcategoryDescriptions[subcategory]}
          isFirst={!hasUncategorized && index === 0}
          expandedRules={expandedRules}
          handleRuleExpandToggle={handleRuleExpandToggle}
          allExpanded={areAllExpanded(groupedRules.groups[subcategory].map(r => r.id))}
          onExpandAll={() => handleExpandRules(groupedRules.groups[subcategory].map(r => r.id))}
          onCollapseAll={() => handleCollapseRules(groupedRules.groups[subcategory].map(r => r.id))}
          allChecked={areAllChecked(groupedRules.groups[subcategory].map(r => r.id))}
          onCheckAll={() => handleCheckRules(groupedRules.groups[subcategory].map(r => r.id))}
          onUncheckAll={() => handleUncheckRules(groupedRules.groups[subcategory].map(r => r.id))}
        />
      ))}
    </>
  )
}

/**
 * Render a subcategory section and its contained rules.
 * @param props - Section label, rules, and bulk action callbacks.
 */
function RulesSection({
  label,
  rules,
  currentCategory,
  description,
  isFirst = false,
  expandedRules,
  handleRuleExpandToggle,
  allExpanded,
  onExpandAll,
  onCollapseAll,
  allChecked,
  onCheckAll,
  onUncheckAll,
  showHeader = true
}: {
  label: string
  rules: BrowserRule[]
  currentCategory?: string
  description?: string
  isFirst?: boolean
  expandedRules: Set<string>
  handleRuleExpandToggle: (ruleId: string, expanded: boolean) => void
  allExpanded: boolean
  onExpandAll: () => void
  onCollapseAll: () => void
  allChecked: boolean
  onCheckAll: () => void
  onUncheckAll: () => void
  showHeader?: boolean
}) {
  return (
    <>
      {showHeader ? (
        <SubcategoryHeader
          label={label}
          ruleIds={rules.map(r => r.id)}
          description={description}
          isFirst={isFirst}
          allExpanded={allExpanded}
          onExpandAll={onExpandAll}
          onCollapseAll={onCollapseAll}
          allChecked={allChecked}
          onCheckAll={onCheckAll}
          onUncheckAll={onUncheckAll}
        />
      ) : null}
      <div className="[&>*:last-child]:border-b-0">
        {rules.map(rule => (
          <RuleRow
            key={rule.id}
            id={rule.id}
            title={rule.title}
            description={rule.description}
            priority={rule.priority}
            categories={rule.categories}
            subcategory={rule.subcategory}
            href={routeRule(rule.primaryCategory, rule.slug)}
            currentCategory={currentCategory}
            isExpanded={expandedRules.has(rule.id)}
            onExpandToggle={handleRuleExpandToggle}
          />
        ))}
      </div>
    </>
  )
}
