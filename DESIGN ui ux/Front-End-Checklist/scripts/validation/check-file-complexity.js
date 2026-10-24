#!/usr/bin/env node

/**
 * Validates file complexity to ensure maintainable code
 * Prevents files from becoming too large or complex
 */

// ============================================================================
// CONFIGURATION - Customize these settings for your project
// ============================================================================

// Complexity limits for different file types
const COMPLEXITY_LIMITS = {
  lines: 500, // Max lines per file
  functions: 15, // Max functions per file
  dependencies: 20, // Max import statements
  nestingDepth: 10, // Max nesting depth (braces)
  cognitiveComplexity: 20 // Max cognitive complexity per function
}

// React-specific limits (stricter for components)
const REACT_LIMITS = {
  lines: 300, // Shorter for React components
  functions: 10, // Fewer functions per component
  dependencies: 15, // Fewer imports
  nestingDepth: 8, // Less nesting in JSX
  cognitiveComplexity: 15 // Simpler component logic
}

// File patterns that should use React limits
const REACT_FILE_PATTERNS = [
  /\.tsx$/, // TypeScript React files
  /\.jsx$/, // JavaScript React files
  /Component\.(ts|js|mjs)$/, // Component files
  /\/components\// // Files in components directory
]

// Files to exclude from complexity checking
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.test\./,
  /\.spec\./,
  /\.d\.ts$/,
  /build\//,
  /dist\//,
  /coverage\//,
  /\.next\//,
  /packages\/config\/src\/routes\.ts$/,
  /packages\/mcp\/src\/tools\/review-code\.ts$/,
  /packages\/state\/src\/index\.ts$/,
  /packages\/types\/src\/index\.ts$/,
  /packages\/virtualization\/src\/index\.tsx$/,
  /^scripts\//
]

// Directories to analyze when no specific files are provided
const ANALYSIS_DIRECTORIES = [
  'src', // Traditional source directory
  'app', // Next.js 13+ app directory
  'pages', // Next.js pages directory
  'components', // React components
  'features', // Feature-based modules
  'lib', // Utility libraries
  'hooks', // React hooks
  'utils', // General utilities
  'types' // TypeScript types
]

// ============================================================================
// IMPLEMENTATION - No need to modify below this line
// ============================================================================

const fs = require('node:fs')
const path = require('node:path')

/**
 * Select the correct complexity limits for a file.
 * @param {string} filePath - File path being analyzed.
 * @returns {{lines: number, functions: number, dependencies: number, nestingDepth: number, cognitiveComplexity: number}} Limits for the file.
 */
function getLimitsForFile(filePath) {
  const isReactFile = REACT_FILE_PATTERNS.some(pattern => pattern.test(filePath))
  return isReactFile ? REACT_LIMITS : COMPLEXITY_LIMITS
}

/**
 * Check whether a file should be skipped by complexity validation.
 * @param {string} filePath - File path to inspect.
 * @returns {boolean} True when the file is excluded.
 */
function shouldExcludeFile(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath))
}

/**
 * Calculate the maximum brace nesting depth for a file.
 * @param {string} content - File content to analyze.
 * @returns {number} Maximum nesting depth.
 */
function calculateNestingDepth(content) {
  let maxDepth = 0
  let currentDepth = 0

  for (const char of content) {
    if (char === '{') {
      currentDepth++
      maxDepth = Math.max(maxDepth, currentDepth)
    } else if (char === '}') {
      currentDepth--
    }
  }

  return maxDepth
}

/**
 * Count function-like declarations in a file.
 * @param {string} content - File content to analyze.
 * @returns {number} Estimated number of functions.
 */
function countFunctions(content) {
  const functionPatterns = [
    /function\s+\w+/g,
    /const\s+\w+\s*=\s*\(/g,
    /const\s+\w+\s*=\s*async\s*\(/g,
    /export\s+function/g,
    /export\s+const\s+\w+\s*=.*=>/g
  ]

  let count = 0
  functionPatterns.forEach(pattern => {
    const matches = content.match(pattern)
    if (matches) count += matches.length
  })

  return count
}

/**
 * Count ES module imports in a file.
 * @param {string} content - File content to analyze.
 * @returns {number} Number of import statements.
 */
function countImports(content) {
  const importPattern = /^import\s+.*from\s+['"][^'"]+['"]/gm
  const matches = content.match(importPattern)
  return matches ? matches.length : 0
}

/**
 * Estimate the cognitive complexity of a file using control-flow heuristics.
 * @param {string} content - File content to analyze.
 * @returns {number} Estimated cognitive complexity score.
 */
function estimateCognitiveComplexity(content) {
  let complexity = 0

  // Count control flow statements
  const controlFlow = [
    /if\s*\(/g,
    /else\s+if\s*\(/g,
    /else\s*{/g,
    /for\s*\(/g,
    /while\s*\(/g,
    /do\s*{/g,
    /switch\s*\(/g,
    /case\s+/g,
    /catch\s*\(/g,
    /\?\s*.*\s*:/g // Ternary operators
  ]

  controlFlow.forEach(pattern => {
    const matches = content.match(pattern)
    if (matches) complexity += matches.length
  })

  // Add extra complexity for nested conditions
  const nestedConditions = content.match(/if\s*\(.*\)\s*{[^}]*if\s*\(/g)
  if (nestedConditions) complexity += nestedConditions.length * 2

  return complexity
}

/**
 * Analyze a file and collect complexity metrics.
 * @param {string} filePath - File path to analyze.
 * @returns {{filePath: string, metrics: {lines: number, functions: number, imports: number, nestingDepth: number, cognitiveComplexity: number}, violations: string[]}} File analysis result.
 */
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').length

  return {
    filePath,
    metrics: {
      lines,
      functions: countFunctions(content),
      imports: countImports(content),
      nestingDepth: calculateNestingDepth(content),
      cognitiveComplexity: estimateCognitiveComplexity(content)
    },
    violations: []
  }
}

/**
 * Compare file metrics against configured limits.
 * @param {{filePath: string, metrics: {lines: number, functions: number, imports: number, nestingDepth: number, cognitiveComplexity: number}, violations: string[]}} analysis - File analysis result.
 * @returns {{filePath: string, metrics: {lines: number, functions: number, imports: number, nestingDepth: number, cognitiveComplexity: number}, violations: string[]}} Analysis with populated violations.
 */
function checkViolations(analysis) {
  const { metrics, filePath } = analysis
  const limits = getLimitsForFile(filePath)
  const violations = []

  if (metrics.lines > limits.lines) {
    violations.push(`File has ${metrics.lines} lines (limit: ${limits.lines})`)
  }

  if (metrics.functions > limits.functions) {
    violations.push(`File has ${metrics.functions} functions (limit: ${limits.functions})`)
  }

  if (metrics.imports > limits.dependencies) {
    violations.push(`File has ${metrics.imports} imports (limit: ${limits.dependencies})`)
  }

  if (metrics.nestingDepth > limits.nestingDepth) {
    violations.push(`Max nesting depth is ${metrics.nestingDepth} (limit: ${limits.nestingDepth})`)
  }

  if (metrics.cognitiveComplexity > limits.cognitiveComplexity * 3) {
    violations.push(`High cognitive complexity: ${metrics.cognitiveComplexity}`)
  }

  analysis.violations = violations
  return analysis
}

/**
 * Generate a machine-readable report from file analyses.
 * @param {Array<{filePath: string, metrics: {lines: number, functions: number, imports: number, nestingDepth: number, cognitiveComplexity: number}, violations: string[]}>} analyses - Completed file analyses.
 * @returns {{timestamp: string, summary: {totalFiles: number, filesWithViolations: number, averageLines: number, averageFunctions: number}, files: Array<{path: string, metrics: {lines: number, functions: number, imports: number, nestingDepth: number, cognitiveComplexity: number}, violations: string[], health: string}>}} Complexity report.
 */
function generateReport(analyses) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: analyses.length,
      filesWithViolations: analyses.filter(a => a.violations.length > 0).length,
      averageLines: Math.round(
        analyses.reduce((sum, a) => sum + a.metrics.lines, 0) / analyses.length
      ),
      averageFunctions: Math.round(
        analyses.reduce((sum, a) => sum + a.metrics.functions, 0) / analyses.length
      )
    },
    files: analyses.map(({ filePath, metrics, violations }) => ({
      path: filePath,
      metrics,
      violations,
      health: violations.length === 0 ? 'good' : violations.length <= 2 ? 'warning' : 'critical'
    }))
  }

  return report
}

/**
 * Produce refactoring suggestions for a file with complexity issues.
 * @param {{filePath: string, metrics: {lines: number, functions: number, imports: number, nestingDepth: number, cognitiveComplexity: number}}} analysis - File analysis result.
 * @returns {string[]} Suggested follow-up actions.
 */
function provideSuggestions(analysis) {
  const suggestions = []
  const { metrics, filePath } = analysis

  if (metrics.lines > COMPLEXITY_LIMITS.lines) {
    suggestions.push(`📦 Consider splitting ${path.basename(filePath)} into smaller modules`)
  }

  if (metrics.functions > COMPLEXITY_LIMITS.functions) {
    suggestions.push('🔧 Extract related functions into separate utility files')
  }

  if (metrics.imports > COMPLEXITY_LIMITS.dependencies) {
    suggestions.push('📚 Review dependencies - consider creating a facade or barrel export')
  }

  if (metrics.nestingDepth > COMPLEXITY_LIMITS.nestingDepth) {
    suggestions.push('🎯 Refactor deeply nested code using early returns or extracting functions')
  }

  if (metrics.cognitiveComplexity > COMPLEXITY_LIMITS.cognitiveComplexity * 3) {
    suggestions.push('🧩 Simplify complex logic by breaking it into smaller, named functions')
  }

  return suggestions
}

/**
 * Run the complexity validator from the command line.
 * @returns {void}
 */
function main() {
  const args = process.argv.slice(2)
  const isReportMode = args.includes('--report')
  const isFixMode = args.includes('--fix')

  let files = args.filter(arg => !arg.startsWith('--'))

  // If no files specified, analyze all source files
  if (files.length === 0 && (isReportMode || isFixMode)) {
    const getAllFiles = (dir, fileList = []) => {
      if (!fs.existsSync(dir)) return fileList

      const items = fs.readdirSync(dir)

      items.forEach(item => {
        const fullPath = path.join(dir, item)

        try {
          const stat = fs.statSync(fullPath)

          if (stat.isDirectory() && !shouldExcludeFile(fullPath)) {
            getAllFiles(fullPath, fileList)
          } else if (
            stat.isFile() &&
            (item.endsWith('.tsx') ||
              item.endsWith('.ts') ||
              item.endsWith('.js') ||
              item.endsWith('.jsx') ||
              item.endsWith('.mjs') ||
              item.endsWith('.cjs')) &&
            !shouldExcludeFile(fullPath)
          ) {
            fileList.push(fullPath)
          }
        } catch (_error) {
          // Skip files that can't be accessed
        }
      })

      return fileList
    }

    // Check configured directories that exist in the project
    const dirs = ANALYSIS_DIRECTORIES.filter(dir => fs.existsSync(dir))
    files = dirs.flatMap(dir => getAllFiles(dir))
  }

  if (files.length === 0) {
    console.log('No files to analyze')
    process.exit(0)
  }

  const analyses = files
    .filter(file => {
      try {
        return fs.existsSync(file) && fs.statSync(file).isFile()
      } catch {
        return false
      }
    })
    .filter(file => !shouldExcludeFile(file))
    .filter(file => !file.includes('lib/types/generated'))
    .map(file => checkViolations(analyzeFile(file)))

  if (isReportMode) {
    const report = generateReport(analyses)
    console.log(JSON.stringify(report, null, 2))
    process.exit(0)
  }

  if (isFixMode) {
    console.log('🔧 Complexity Analysis & Refactoring Suggestions\n')

    analyses.forEach(analysis => {
      if (analysis.violations.length > 0) {
        console.log(`📁 ${analysis.filePath}`)
        console.log('  Issues:')
        analysis.violations.forEach(v => console.log(`    - ${v}`))

        const suggestions = provideSuggestions(analysis)
        if (suggestions.length > 0) {
          console.log('  Suggestions:')
          suggestions.forEach(s => console.log(`    ${s}`))
        }
        console.log()
      }
    })

    const problematicFiles = analyses.filter(a => a.violations.length > 0)
    if (problematicFiles.length === 0) {
      console.log('✅ All files pass complexity checks!')
    } else {
      console.log(`Found ${problematicFiles.length} files that need attention`)
    }

    process.exit(0)
  }

  // Normal validation mode
  const hasViolations = analyses.some(a => a.violations.length > 0)

  if (hasViolations) {
    console.log('❌ Complexity violations found:\n')

    analyses
      .filter(a => a.violations.length > 0)
      .forEach(({ filePath, violations }) => {
        console.log(`📁 ${filePath}:`)
        violations.forEach(v => console.log(`  - ${v}`))
        console.log()
      })

    process.exit(1)
  }

  process.exit(0)
}

// Run validation (only if called directly)
if (require.main === module) {
  main()
}

// Export for use in ESLint plugin
module.exports = {
  DEFAULT_LIMITS: COMPLEXITY_LIMITS,
  ANALYSIS_DIRECTORIES,
  EXCLUDE_PATTERNS,
  analyzeFile,
  getLimitsForFile,
  shouldExcludeFile
}
