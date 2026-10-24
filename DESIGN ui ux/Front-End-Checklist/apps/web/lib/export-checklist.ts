/**
 * Export utilities for checklist data
 * Supports CSV, JSON, and Markdown formats
 */

export interface ExportRule {
  id: string
  title: string
  description?: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  primaryCategory: string
  subcategory?: string | null
  completed: boolean
}

export interface ExportStats {
  total: number
  completed: number
  percentage: number
}

export interface ExportData {
  name: string
  exportedAt: string
  stats: ExportStats
  rules: ExportRule[]
}

export type ExportFormat = 'csv' | 'json' | 'markdown'

/**
 * Export checklist data to CSV format
 */
export function exportToCSV(rules: ExportRule[]): string {
  const headers = ['Title', 'Status', 'Priority', 'Category', 'Subcategory', 'Description']
  const rows = rules.map(rule => [
    `"${rule.title.replace(/"/g, '""')}"`,
    rule.completed ? 'Completed' : 'Pending',
    rule.priority,
    rule.primaryCategory,
    rule.subcategory || '',
    `"${(rule.description || '').replace(/"/g, '""')}"`
  ])
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
}

/**
 * Export checklist data to JSON format
 */
export function exportToJSON(rules: ExportRule[], name: string, stats: ExportStats): string {
  const data: ExportData = {
    name,
    exportedAt: new Date().toISOString(),
    stats,
    rules
  }
  return JSON.stringify(data, null, 2)
}

/**
 * Export checklist data to Markdown format
 */
export function exportToMarkdown(rules: ExportRule[], name: string, stats: ExportStats): string {
  const lines = [
    `# ${name} Checklist`,
    '',
    `Progress: ${stats.completed}/${stats.total} (${stats.percentage}%)`,
    '',
    `Exported: ${new Date().toLocaleDateString()}`,
    '',
    '---',
    ''
  ]

  // Group rules by subcategory for better organization
  const initialGrouped: Record<string, ExportRule[]> = {}
  const grouped = rules.reduce((acc, rule) => {
    const key = rule.subcategory || 'General'
    if (!acc[key]) acc[key] = []
    acc[key].push(rule)
    return acc
  }, initialGrouped)

  for (const [subcategory, subcategoryRules] of Object.entries(grouped)) {
    lines.push(`## ${subcategory}`, '')
    for (const rule of subcategoryRules) {
      const checkbox = rule.completed ? '[x]' : '[ ]'
      lines.push(`- ${checkbox} **${rule.title}** (${rule.priority})`)
      if (rule.description) {
        lines.push(`  - ${rule.description}`)
      }
    }
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Generate filename for export
 */
export function generateFilename(name: string, format: ExportFormat): string {
  const sanitized = name.toLowerCase().replace(/\s+/g, '-')
  const extensions: Record<ExportFormat, string> = {
    csv: 'csv',
    json: 'json',
    markdown: 'md'
  }
  return `${sanitized}-checklist.${extensions[format]}`
}

/**
 * Get MIME type for export format
 */
export function getMimeType(format: ExportFormat): string {
  const mimeTypes: Record<ExportFormat, string> = {
    csv: 'text/csv',
    json: 'application/json',
    markdown: 'text/markdown'
  }
  return mimeTypes[format]
}

/**
 * Download exported content as a file
 */
export function downloadExport(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Export checklist in the specified format and trigger download
 */
export function exportChecklist(
  rules: ExportRule[],
  name: string,
  stats: ExportStats,
  format: ExportFormat
): void {
  let content: string

  switch (format) {
    case 'csv':
      content = exportToCSV(rules)
      break
    case 'json':
      content = exportToJSON(rules, name, stats)
      break
    case 'markdown':
      content = exportToMarkdown(rules, name, stats)
      break
  }

  const filename = generateFilename(name, format)
  const mimeType = getMimeType(format)
  downloadExport(content, filename, mimeType)
}
