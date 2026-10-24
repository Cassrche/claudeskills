import { GITHUB_REPO_URL, MCP_SERVER_URL, SITE_URL } from '@repo/config'
import { allGuides, allRules } from 'content-collections'

interface RulesByCategory {
  [category: string]: Array<{
    slug: string
    title: string
    priority: string
  }>
}

/**
 * Convert an internal guide type into the compact llms.txt label.
 *
 * @param type - Guide type value.
 * @returns Label used in the plain-text guide index.
 */
function formatGuideTypeLabel(type: 'how-to' | 'insight') {
  return type === 'how-to' ? 'Guide' : 'Insight'
}

/** Converts a kebab-case category slug to a Title Case display name. */
function formatCategoryName(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/** Builds the compact llms.txt summary with categories, MCP info, and rule links. */
function generateLlmsTxt(): string {
  // Filter to English rules only
  const englishRules = allRules.filter(rule => rule.language === 'en')
  const englishGuides = allGuides.filter(guide => guide.language === 'en')

  // Group rules by primary category
  const rulesByCategory = englishRules.reduce<RulesByCategory>((acc, rule) => {
    const category = rule.primaryCategory
    if (!acc[category]) acc[category] = []
    acc[category].push({
      slug: rule.slug,
      title: rule.title,
      priority: rule.priority
    })
    return acc
  }, {})

  const sortedCategories = Object.keys(rulesByCategory).sort()

  let content = `# Front-End Checklist

> ${englishRules.length} frontend best practice rules across HTML, CSS, JavaScript, Accessibility, SEO, Security, Performance, Images, and Testing. Free, open-source.

## Use via MCP (AI Agents)

- MCP Endpoint: ${MCP_SERVER_URL}
- MCP Docs: ${SITE_URL}/mcp
- VS Code: Add \`${MCP_SERVER_URL}\` to .vscode/mcp.json

\`\`\`json
{
  "mcpServers": {
    "frontendchecklist": {
      "type": "http",
      "url": "${MCP_SERVER_URL}"
    }
  }
}
\`\`\`

### MCP Tools
- review_code — Audit HTML/CSS/JS against all rules at once
- audit_url — Fetch a live URL and audit its HTML automatically
- get_workflow — Get ordered checklist for a workflow
- get_checklist_rules — Batch-fetch full rules for a checklist
- get_rule — Full details for one rule
- search_rules — Search by keyword or category
- check_rule / fix_rule / explain_rule — Rule-specific prompts
- list_categories — All categories with rule counts
- get_quick_reference — Compact priority-filtered view

## Resources

- [Rules Browser](${SITE_URL}/rules)
- [Guides](${SITE_URL}/guides)
- [Full Reference](${SITE_URL}/llms-full.txt)
- [MCP Docs](${SITE_URL}/mcp)

## Optional

- [GitHub](${GITHUB_REPO_URL})

## Categories

`

  for (const category of sortedCategories) {
    const rules = rulesByCategory[category]
    const categoryName = formatCategoryName(category)
    const criticalCount = rules.filter(r => r.priority === 'critical').length
    const highCount = rules.filter(r => r.priority === 'high').length
    content += `- [${categoryName}](${SITE_URL}/rules/${category}) — ${rules.length} rules`
    if (criticalCount > 0) content += `, ${criticalCount} critical`
    if (highCount > 0) content += `, ${highCount} high`
    content += '\n'
  }

  content += '\n## Guides\n\n'

  for (const guide of [...englishGuides].sort((a, b) => a.title.localeCompare(b.title))) {
    content += `- [${guide.title}](${SITE_URL}/guides/${guide.slug}) — ${formatGuideTypeLabel(guide.type)}, ${guide.category}\n`
  }

  content += '\n## Rules\n\n'

  // Compact: slug + title per line, grouped by category
  for (const category of sortedCategories) {
    const rules = rulesByCategory[category]
    const categoryName = formatCategoryName(category)

    content += `### ${categoryName}\n\n`

    // Sort by priority
    const priorityOrder = ['critical', 'high', 'medium', 'low']
    const sortedRules = [...rules].sort(
      (a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority)
    )

    for (const rule of sortedRules) {
      const priorityTag =
        rule.priority === 'critical' ? ' [critical]' : rule.priority === 'high' ? ' [high]' : ''
      content += `- [${rule.title}](${SITE_URL}/rules/${category}/${rule.slug})${priorityTag}\n`
    }

    content += '\n'
  }

  content += `---\n\nFor full rule content including descriptions, AI prompts, and automation guidance: ${SITE_URL}/llms-full.txt\n`

  return content
}

/** Serves the compact llms.txt summary as a plain-text response. */
export async function GET() {
  const content = generateLlmsTxt()

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400'
    }
  })
}
