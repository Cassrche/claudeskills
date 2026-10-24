import { APP_NAME, CATEGORY_LABELS, EXPORT, PRIORITY_LABELS } from '@repo/config'
import { validateExportData, validateImportData } from '@repo/schemas'
import type {
  ExportData,
  ExportFormat,
  ExportOptions,
  Rule,
  UserPreferences,
  UserProgress
} from '@repo/types'

/** Manage exporting and importing checklist data in supported formats. */
export class ExportManager {
  private static instance: ExportManager

  private constructor() {}

  static getInstance(): ExportManager {
    if (!ExportManager.instance) {
      ExportManager.instance = new ExportManager()
    }
    return ExportManager.instance
  }

  // Main export function
  async exportData(
    rules: Rule[],
    progress: UserProgress[],
    preferences: UserPreferences | null,
    options: ExportOptions
  ): Promise<{ data: string | Blob; filename: string; mimeType: string }> {
    // Validate export size
    if (rules.length > EXPORT.MAX_ITEMS) {
      throw new Error(`Cannot export more than ${EXPORT.MAX_ITEMS} items`)
    }

    // Prepare export data
    const exportData = this.prepareExportData(rules, progress, preferences, options)

    // Validate the data
    const validation = validateExportData(exportData)
    if (!validation.success) {
      throw new Error('Invalid export data')
    }

    // Export based on format
    switch (options.format) {
      case 'json':
        return this.exportJSON(exportData, options)
      case 'csv':
        return this.exportCSV(exportData, options)
      case 'pdf':
        return this.exportPDF(exportData, options)
      case 'markdown':
        return this.exportMarkdown(exportData, options)
      case 'html':
        return this.exportHTML(exportData, options)
      default:
        throw new Error(`Unsupported export format: ${options.format}`)
    }
  }

  // Prepare export data with filtering
  private prepareExportData(
    rules: Rule[],
    progress: UserProgress[],
    preferences: UserPreferences | null,
    options: ExportOptions
  ): ExportData {
    let filteredRules = [...rules]
    let filteredProgress = [...progress]

    // Apply category filter
    if (options.categories && options.categories.length > 0) {
      filteredRules = filteredRules.filter(rule =>
        rule.categories.some(cat => options.categories?.includes(cat))
      )
    }

    // Apply priority filter
    if (options.priorities && options.priorities.length > 0) {
      filteredRules = filteredRules.filter(rule => options.priorities?.includes(rule.priority))
    }

    // Filter progress to match rules
    const ruleIds = new Set(filteredRules.map(r => r.slug))
    filteredProgress = filteredProgress.filter(p => ruleIds.has(p.ruleId))

    // Apply completion filter
    if (!options.includeCompleted) {
      const completedIds = new Set(filteredProgress.filter(p => p.completed).map(p => p.ruleId))
      filteredRules = filteredRules.filter(rule => !completedIds.has(rule.slug))
      filteredProgress = filteredProgress.filter(p => !p.completed)
    }

    // Remove notes if not included
    if (!options.includeNotes) {
      filteredProgress = filteredProgress.map(p => ({ ...p, notes: undefined }))
    }

    const completedCount = filteredProgress.filter(p => p.completed).length

    return {
      metadata: {
        exportedAt: new Date(),
        version: '2.0.0',
        totalRules: filteredRules.length,
        completedRules: completedCount,
        progress: filteredRules.length > 0 ? (completedCount / filteredRules.length) * 100 : 0
      },
      rules: filteredRules,
      progress: filteredProgress,
      preferences: preferences || undefined
    }
  }

  // Export to JSON
  private exportJSON(data: ExportData, options: ExportOptions) {
    const jsonString = JSON.stringify(data, null, 2)
    const filename = this.generateFilename('json', options)

    return {
      data: jsonString,
      filename,
      mimeType: 'application/json'
    }
  }

  // Export to CSV
  private exportCSV(data: ExportData, options: ExportOptions) {
    const progressMap = new Map(data.progress.map(p => [p.ruleId, p]))

    const headers = ['Title', 'Category', 'Priority', 'Completed', 'Completed Date', 'Notes', 'URL']

    const rows = data.rules.map(rule => {
      const ruleProgress = progressMap.get(rule.slug)

      return [
        this.escapeCsvValue(rule.title),
        rule.primaryCategory,
        rule.priority,
        ruleProgress?.completed ? 'Yes' : 'No',
        ruleProgress?.completedAt?.toISOString() || '',
        this.escapeCsvValue(ruleProgress?.notes || ''),
        rule.url
      ]
    })

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')

    const filename = this.generateFilename('csv', options)

    return {
      data: csvContent,
      filename,
      mimeType: 'text/csv'
    }
  }

  // Export to PDF (simplified - would need full implementation)
  private async exportPDF(data: ExportData, options: ExportOptions) {
    // This is a simplified implementation
    // In production, you'd use jsPDF with proper formatting

    const content = this.generateHTMLContent(data)
    const filename = this.generateFilename('pdf', options)

    // Convert HTML to PDF (placeholder - needs jsPDF implementation)
    const pdfContent = `PDF Export of ${APP_NAME}\n\n${this.stripHtml(content)}`

    return {
      data: new Blob([pdfContent], { type: 'application/pdf' }),
      filename,
      mimeType: 'application/pdf'
    }
  }

  // Export to Markdown
  private exportMarkdown(data: ExportData, options: ExportOptions) {
    const { metadata, rules, progress } = data
    const progressMap = new Map(progress.map(p => [p.ruleId, p]))

    let markdown = `# ${APP_NAME} Export\n\n`
    markdown += `**Exported**: ${metadata.exportedAt.toLocaleDateString()}\n`
    markdown += `**Total Rules**: ${metadata.totalRules}\n`
    markdown += `**Completed**: ${metadata.completedRules} (${metadata.progress.toFixed(1)}%)\n\n`

    // Group rules by category
    const rulesByCategory = new Map<string, Rule[]>()
    rules.forEach(rule => {
      const category = rule.primaryCategory
      if (!rulesByCategory.has(category)) {
        rulesByCategory.set(category, [])
      }
      rulesByCategory.get(category)!.push(rule)
    })

    // Generate markdown for each category
    for (const [category, categoryRules] of rulesByCategory) {
      const categoryLabel = CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category
      markdown += `## ${categoryLabel}\n\n`

      categoryRules.forEach(rule => {
        const ruleProgress = progressMap.get(rule.slug)
        const isCompleted = ruleProgress?.completed || false
        const checkbox = isCompleted ? '[x]' : '[ ]'

        markdown += `${checkbox} **${rule.title}** _(${PRIORITY_LABELS[rule.priority]})_\n`
        markdown += `   ${rule.content}\n`

        if (ruleProgress?.notes && options.includeNotes) {
          markdown += `   _Note: ${ruleProgress.notes}_\n`
        }

        markdown += '\n'
      })
    }

    const filename = this.generateFilename('md', options)

    return {
      data: markdown,
      filename,
      mimeType: 'text/markdown'
    }
  }

  // Export to HTML
  private exportHTML(data: ExportData, options: ExportOptions) {
    const content = this.generateHTMLContent(data)
    const filename = this.generateFilename('html', options)

    return {
      data: content,
      filename,
      mimeType: 'text/html'
    }
  }

  // Generate HTML content
  private generateHTMLContent(data: ExportData): string {
    const { metadata, rules, progress } = data
    const progressMap = new Map(progress.map(p => [p.ruleId, p]))

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${APP_NAME} Export</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .stats { background: #f5f5f5; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
        .category { margin-bottom: 30px; }
        .category h2 { color: #333; border-bottom: 1px solid #ccc; }
        .rule { margin-bottom: 15px; padding: 10px; border-left: 3px solid #ddd; }
        .rule.completed { border-left-color: #4caf50; background: #f8fff8; }
        .rule-title { font-weight: bold; color: #333; }
        .rule-priority { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 12px; }
        .priority-critical { background: #f44336; color: white; }
        .priority-high { background: #ff9800; color: white; }
        .priority-medium { background: #2196f3; color: white; }
        .priority-low { background: #4caf50; color: white; }
        .rule-content { margin: 5px 0; }
        .rule-notes { font-style: italic; color: #666; margin-top: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${APP_NAME} Export</h1>
        <p>Generated on ${metadata.exportedAt.toLocaleDateString()}</p>
    </div>
    
    <div class="stats">
        <strong>Export Statistics:</strong><br>
        Total Rules: ${metadata.totalRules}<br>
        Completed: ${metadata.completedRules} (${metadata.progress.toFixed(1)}%)<br>
    </div>`

    // Group rules by category
    const rulesByCategory = new Map<string, Rule[]>()
    rules.forEach(rule => {
      const category = rule.primaryCategory
      if (!rulesByCategory.has(category)) {
        rulesByCategory.set(category, [])
      }
      rulesByCategory.get(category)!.push(rule)
    })

    // Generate HTML for each category
    for (const [category, categoryRules] of rulesByCategory) {
      const categoryLabel = CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category
      html += `\n    <div class="category">
        <h2>${categoryLabel}</h2>`

      categoryRules.forEach(rule => {
        const ruleProgress = progressMap.get(rule.slug)
        const isCompleted = ruleProgress?.completed || false

        html += `
        <div class="rule ${isCompleted ? 'completed' : ''}">
            <div class="rule-title">
                ${isCompleted ? '✅' : '⬜'} ${this.escapeHtml(rule.title)}
                <span class="rule-priority priority-${rule.priority}">${PRIORITY_LABELS[rule.priority]}</span>
            </div>
            <div class="rule-content">${this.escapeHtml(rule.content)}</div>`

        if (ruleProgress?.notes) {
          html += `<div class="rule-notes">Note: ${this.escapeHtml(ruleProgress.notes)}</div>`
        }

        html += '</div>'
      })

      html += '\n    </div>'
    }

    html += '\n</body>\n</html>'

    return html
  }

  /** Import export data from a supported serialized format. */
  async importData(fileContent: string, format: ExportFormat): Promise<ExportData> {
    let parsedData: any

    try {
      switch (format) {
        case 'json':
          parsedData = JSON.parse(fileContent)
          break
        case 'csv':
          parsedData = this.parseCSV(fileContent)
          break
        default:
          throw new Error(`Import not supported for format: ${format}`)
      }

      // Validate imported data
      const validation = validateImportData(parsedData)
      if (!validation.success) {
        throw new Error('Invalid import data format')
      }

      return parsedData
    } catch (error) {
      throw new Error(
        `Failed to import data: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // Parse CSV data
  private parseCSV(csvContent: string): any {
    const lines = csvContent.split('\n').filter(line => line.trim())
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header and one data row')
    }

    const headers = lines[0].split(',').map(h => h.trim())
    const rules: any[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      if (values.length !== headers.length) continue

      const rule: any = {}
      headers.forEach((header, index) => {
        rule[header.toLowerCase()] = values[index]
      })

      rules.push({
        id: rule.title?.toLowerCase().replace(/\s+/g, '-'),
        completed: rule.completed === 'Yes',
        notes: rule.notes || undefined
      })
    }

    return {
      version: '2.0.0',
      rules
    }
  }

  // Utility functions
  private generateFilename(extension: string, options: ExportOptions): string {
    const timestamp = new Date().toISOString().split('T')[0]
    const categories = options.categories?.join('-') || 'all'
    return `${APP_NAME.toLowerCase()}-${categories}-${timestamp}.${extension}`
  }

  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  private stripHtml(html: string): string {
    const div = document.createElement('div')
    div.innerHTML = html
    return div.textContent || div.innerText || ''
  }
}

// Create singleton instance
export const exportManager = ExportManager.getInstance()

// Export convenience functions
export const exportData = (
  rules: Rule[],
  progress: UserProgress[],
  preferences: UserPreferences | null,
  options: ExportOptions
) => exportManager.exportData(rules, progress, preferences, options)

/** Import serialized checklist data with the shared export manager. */
export const importData = (content: string, format: ExportFormat) =>
  exportManager.importData(content, format)

/** Download serialized export data in the browser. */
export function downloadFile(data: string | Blob, filename: string, mimeType: string): void {
  if (typeof window === 'undefined') return

  const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/** Read a browser File object as text. */
export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
