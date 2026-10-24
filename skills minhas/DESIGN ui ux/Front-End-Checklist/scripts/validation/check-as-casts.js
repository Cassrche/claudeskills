#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Validates that TypeScript files don't use 'as' type assertions
 * Enforces proper type safety without type casting
 */

// ============================================================================
// CONFIGURATION - Customize these settings for your project
// ============================================================================

// Patterns to detect unsafe 'as' type assertions
const AS_CAST_PATTERNS = [
  // Match 'as Type' but not 'as const'
  /\bas\s+(?!const\b)[A-Z]\w*/g,
  // Match 'as any'
  /\bas\s+any\b/g,
  // Match 'as unknown'
  /\bas\s+unknown\b/g,
  // Match generic as casts like 'as Array<T>'
  /\bas\s+[A-Z]\w*\s*</g,
  // Match parenthesized as casts
  /\)\s*as\s+[A-Z]\w*/g
]

// Exceptions where 'as' might be acceptable
const ALLOWED_PATTERNS = [
  // Allow 'as const' for const assertions
  /\bas\s+const\b/g,
  // Allow 'as any' for necessary type compatibility
  /\bas\s+any\b/g,
  // Allow in test files for mocking
  /\.test\.(ts|tsx)$/,
  /\.spec\.(ts|tsx)$/,
  /__tests__/,
  // Allow in migration scripts (temporary)
  /scripts\/migrate.*\.ts$/,
  /scripts\/.*\.ts$/,
  // Allow in config files for environment variable parsing
  /packages\/config\/src\/index\.ts$/,
  /packages\/config\/src\/app\.ts$/,
  /packages\/config\/src\/categories\.ts$/,
  /packages\/config\/src\/priorities\.ts$/,
  // Allow in data-layer hooks for query client type assertions
  /packages\/data-layer\/src\/hooks\.ts$/,
  /packages\/mcp\/src\/cli\.ts$/,
  /packages\/mcp\/src\/server\.ts$/,
  /packages\/mcp\/src\/server-tools\.ts$/,
  /packages\/mcp\/src\/server-resources\.ts$/,
  /packages\/mcp\/src\/server-prompts\.ts$/,
  /packages\/cli\/src\/index\.ts$/,
  /apps\/web\/app\/\(site\)\/lists\/page\.tsx$/,
  /packages\/types\/src\/index\.ts$/
]

// Directories to exclude from checking
const EXCLUDE_PATHS = ['node_modules', 'dist', 'build', '.next', 'coverage', '.git', 'public']

// ============================================================================
// IMPLEMENTATION - No need to modify below this line
// ============================================================================

const fs = require('node:fs')
const path = require('node:path')
const { execSync } = require('node:child_process')

// Colors for terminal output
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

/**
 * Check if a file path should be excluded
 */
function shouldExcludeFile(filePath) {
  return EXCLUDE_PATHS.some(exclude => filePath.includes(exclude))
}

/**
 * Check if a file is allowed to have as casts
 */
function isAllowedFile(filePath) {
  return ALLOWED_PATTERNS.some(pattern => {
    if (pattern instanceof RegExp) {
      return pattern.test(filePath)
    }
    return false
  })
}

/**
 * Check if a match is inside a string literal
 */
function isInsideStringLiteral(line, matchIndex) {
  let inSingleQuote = false
  let inDoubleQuote = false
  let inTemplate = false

  for (let i = 0; i < matchIndex; i++) {
    const char = line[i]
    const prevChar = i > 0 ? line[i - 1] : null

    if (char === "'" && prevChar !== '\\' && !inDoubleQuote && !inTemplate) {
      inSingleQuote = !inSingleQuote
    } else if (char === '"' && prevChar !== '\\' && !inSingleQuote && !inTemplate) {
      inDoubleQuote = !inDoubleQuote
    } else if (char === '`' && prevChar !== '\\' && !inSingleQuote && !inDoubleQuote) {
      inTemplate = !inTemplate
    }
  }

  return inSingleQuote || inDoubleQuote || inTemplate
}

/**
 * Find all as casts in a file
 */
function findAsCasts(filePath, content) {
  const violations = []
  const lines = content.split('\n')

  lines.forEach((line, index) => {
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      return
    }

    // Skip import statements (import aliases are not type casts)
    if (line.includes('import ') && line.includes(' from ')) {
      return
    }

    // Check each pattern
    AS_CAST_PATTERNS.forEach(pattern => {
      const matches = line.matchAll(pattern)
      for (const match of matches) {
        // Skip if inside a string literal
        if (isInsideStringLiteral(line, match.index)) {
          continue
        }

        // Check if it's not an allowed pattern
        const isAllowed = ALLOWED_PATTERNS.some(allowed => {
          if (allowed instanceof RegExp && !allowed.test(filePath)) {
            return allowed.test(match[0])
          }
          return false
        })

        if (!isAllowed) {
          violations.push({
            line: index + 1,
            column: match.index + 1,
            match: match[0],
            text: line.trim()
          })
        }
      }
    })
  })

  return violations
}

/**
 * Check a specific file for as casts
 */
function checkFileForAsCasts(filePath) {
  if (!fs.existsSync(filePath)) {
    return []
  }

  if (shouldExcludeFile(filePath) || isAllowedFile(filePath)) {
    return []
  }

  const content = fs.readFileSync(filePath, 'utf8')
  return findAsCasts(filePath, content)
}

/**
 * Get list of staged TypeScript files
 */
function getStagedFiles() {
  try {
    const result = execSync('git diff --cached --name-only --diff-filter=ACM', {
      encoding: 'utf8'
    })

    return result
      .split('\n')
      .filter(file => file && (file.endsWith('.ts') || file.endsWith('.tsx')))
      .filter(file => !shouldExcludeFile(file))
  } catch (_error) {
    return []
  }
}

/**
 * Get all TypeScript files (for full check)
 */
function getAllTypeScriptFiles() {
  const files = []

  /**
   * Recursively walk directory to find TypeScript files
   *
   * @param {string} dir - Directory to walk
   */
  function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        if (!shouldExcludeFile(fullPath)) {
          walkDir(fullPath)
        }
      } else if (entry.isFile()) {
        if (
          (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
          !shouldExcludeFile(fullPath)
        ) {
          files.push(fullPath)
        }
      }
    }
  }

  walkDir('.')
  return files
}

/**
 * Main validation function
 */
function validateFiles(files, _isStaged = true) {
  console.log(`${colors.blue}🔍 Checking for 'as' type casts...${colors.reset}`)

  let totalViolations = 0
  const fileViolations = {}

  for (const file of files) {
    // Skip allowed files
    if (isAllowedFile(file)) {
      continue
    }

    try {
      const content = fs.readFileSync(file, 'utf8')
      const violations = findAsCasts(file, content)

      if (violations.length > 0) {
        fileViolations[file] = violations
        totalViolations += violations.length
      }
    } catch (_error) {
      console.error(`${colors.yellow}⚠️  Warning: Could not read ${file}${colors.reset}`)
    }
  }

  // Report results
  if (totalViolations > 0) {
    console.log(`${colors.red}❌ Found 'as' type cast violations:${colors.reset}\n`)

    Object.entries(fileViolations).forEach(([file, violations]) => {
      console.log(`${colors.bold}📁 ${file}:${colors.reset}`)
      violations.forEach(violation => {
        console.log(`  Line ${violation.line}: ${colors.red}${violation.match}${colors.reset}`)
        console.log(`    ${colors.yellow}${violation.text}${colors.reset}`)
      })
      console.log('')
    })

    console.log(
      `${colors.red}❌ COMMIT BLOCKED: Found ${totalViolations} 'as' type cast${totalViolations > 1 ? 's' : ''}!${colors.reset}`
    )
    console.log(
      `${colors.yellow}💡 Replace 'as' casts with proper type guards or type predicates${colors.reset}`
    )
    console.log(`${colors.blue}📋 Examples of better alternatives:${colors.reset}`)
    console.log('  - Use type guards: if (typeof x === "string") { ... }')
    console.log('  - Use type predicates: function isString(x: unknown): x is string { ... }')
    console.log('  - Fix the source type instead of casting')
    console.log('  - Use generics for flexible types')
    console.log(
      `  - If absolutely necessary, use type assertion functions instead${colors.reset}\n`
    )

    process.exit(1)
  } else {
    console.log(`${colors.green}✅ No 'as' type casts found${colors.reset}`)
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const isFullCheck = args.includes('--all')
const isFix = args.includes('--fix')

if (isFix) {
  console.log(
    `${colors.yellow}⚠️  --fix is not supported for as casts (requires manual refactoring)${colors.reset}`
  )
  process.exit(0)
}

// Get files to check
let files
const specificFiles = args.filter(
  arg => !arg.startsWith('--') && (arg.endsWith('.ts') || arg.endsWith('.tsx'))
)

if (specificFiles.length > 0) {
  // Use specific files provided as arguments
  files = specificFiles.filter(file => fs.existsSync(file))
} else if (isFullCheck) {
  // Check all TypeScript files
  files = getAllTypeScriptFiles()
} else {
  // Check only staged files (for git hooks)
  files = getStagedFiles()
}

if (files.length === 0) {
  console.log(`${colors.blue}ℹ️  No TypeScript files to check${colors.reset}`)
  process.exit(0)
}

// Run validation (only if called directly)
if (require.main === module) {
  validateFiles(files, !isFullCheck)
}

// Export for use in ESLint plugin
module.exports = {
  AS_CAST_PATTERNS,
  ALLOWED_PATTERNS,
  EXCLUDE_PATHS,
  checkFileForAsCasts,
  findAsCasts,
  shouldExcludeFile,
  isAllowedFile
}
