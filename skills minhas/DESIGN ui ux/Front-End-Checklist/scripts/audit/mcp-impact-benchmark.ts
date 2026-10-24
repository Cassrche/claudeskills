/**
 * MCP impact benchmark harness.
 *
 * This script creates and scores an A/B benchmark for answering the question:
 * does MCP access help an agent produce better frontend code fixes?
 *
 * Usage:
 *   pnpm mcp:impact -- --init .mcp-impact/run-001
 *   pnpm mcp:impact -- --score .mcp-impact/run-001
 *   pnpm mcp:impact -- --self-test
 */

import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { loadRules } from '@frontendchecklist/rules/load-rules'
import type { Category, Rule } from '@repo/types'
import { executeReviewCode } from '../../packages/mcp/src/tools/review-code'

interface BenchmarkTask {
  id: string
  title: string
  filePath: string
  focus: Category[]
  expectedRules: string[]
  initialCode: string
  fixedCode: string
  prompt: string
}

interface TaskScore {
  id: string
  fixedRules: string[]
  missedRules: string[]
  residualIssues: string[]
}

interface ConditionScore {
  condition: string
  fixedCount: number
  expectedCount: number
  score: number
  tasks: TaskScore[]
}

interface BenchmarkScore {
  withoutMcp: ConditionScore
  withMcp: ConditionScore
  delta: number
}

const WITHOUT_MCP = 'without-mcp'
const WITH_MCP = 'with-mcp'
const WORKSPACE_RULES_DIR = path.resolve(process.cwd(), 'packages/content/rules/en')

const TASKS: BenchmarkTask[] = [
  {
    id: 'image-card',
    title: 'Improve image markup',
    filePath: 'src/image-card.html',
    focus: ['images'],
    expectedRules: ['alt-text', 'dimensions'],
    initialCode: `<article class="card">
  <img src="/dashboard.jpg">
  <h2>Analytics dashboard</h2>
</article>
`,
    fixedCode: `<article class="card">
  <img src="/dashboard.jpg" alt="Analytics dashboard preview" width="1200" height="630">
  <h2>Analytics dashboard</h2>
</article>
`,
    prompt:
      'Improve the image markup so it is accessible and avoids avoidable layout shift. Keep the markup simple.'
  },
  {
    id: 'icon-button',
    title: 'Improve icon-only button accessibility',
    filePath: 'src/icon-button.html',
    focus: ['accessibility'],
    expectedRules: ['button-name'],
    initialCode: `<button type="button">
  <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 4l12 12M16 4L4 16" /></svg>
</button>
`,
    fixedCode: `<button type="button" aria-label="Close">
  <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 4l12 12M16 4L4 16" /></svg>
</button>
`,
    prompt:
      'Improve the icon-only button so assistive technology can identify its action. Keep the icon decorative.'
  },
  {
    id: 'external-link',
    title: 'Harden a new-tab external link',
    filePath: 'src/external-link.html',
    focus: ['security'],
    expectedRules: ['new-tab'],
    initialCode: `<a href="https://example.com/docs" target="_blank">Read docs</a>
`,
    fixedCode: `<a href="https://example.com/docs" target="_blank" rel="noopener noreferrer">Read docs</a>
`,
    prompt:
      'Improve this external link so opening it in a new tab does not create a tabnabbing risk.'
  },
  {
    id: 'unsafe-eval',
    title: 'Remove unsafe dynamic execution',
    filePath: 'src/calculate.js',
    focus: ['javascript'],
    expectedRules: ['avoid-eval'],
    initialCode: `export function calculate(userInput) {
  return eval(userInput)
}
`,
    fixedCode: `export function calculate(expression) {
  return parseAllowedExpression(expression)
}
`,
    prompt:
      'Remove unsafe dynamic code execution while preserving a clear extension point for a safe parser.'
  },
  {
    id: 'viewport-zoom',
    title: 'Restore user zoom',
    filePath: 'src/document-head.html',
    focus: ['accessibility'],
    expectedRules: ['viewport-zoom'],
    initialCode: `<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
`,
    fixedCode: `<meta name="viewport" content="width=device-width, initial-scale=1">
`,
    prompt: 'Improve the viewport tag so users can zoom the page when they need larger text.'
  }
]

function usage(): string {
  return `Usage:
  pnpm mcp:impact -- --init <benchmark-dir>
  pnpm mcp:impact -- --score <benchmark-dir>
  pnpm mcp:impact -- --self-test
`
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true })
}

function writeFile(filePath: string, content: string): void {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, content)
}

function writeTask(conditionDir: string, task: BenchmarkTask, code: string): void {
  const taskDir = path.join(conditionDir, task.id)
  writeFile(path.join(taskDir, task.filePath), code)
  writeFile(
    path.join(taskDir, 'README.md'),
    `# ${task.title}

${task.prompt}

Edit \`${task.filePath}\`. Keep the change focused on the requested frontend quality improvement.
`
  )
}

function initBenchmark(rootDir: string): void {
  const resolvedRoot = path.resolve(rootDir)
  ensureDir(resolvedRoot)

  for (const task of TASKS) {
    writeTask(path.join(resolvedRoot, WITHOUT_MCP), task, task.initialCode)
    writeTask(path.join(resolvedRoot, WITH_MCP), task, task.initialCode)
  }

  writeFile(
    path.join(resolvedRoot, 'README.md'),
    `# MCP Impact Benchmark

This benchmark measures whether MCP access helps an agent improve frontend code.

Run the same model twice:

1. In \`${WITHOUT_MCP}/\`, disable the Front-End Checklist MCP.
2. In \`${WITH_MCP}/\`, enable the Front-End Checklist MCP and allow the agent to use it.
3. Keep the prompt, model, temperature, and time budget the same.
4. Score both outputs:

\`\`\`bash
pnpm mcp:impact -- --score ${rootDir}
\`\`\`

Use this root prompt for both runs:

> Improve each task's code for frontend quality. Keep changes focused, avoid unrelated rewrites, and edit only the task files.
`
  )

  console.log(`Created MCP impact benchmark at ${resolvedRoot}`)
}

function scoreTask(conditionDir: string, task: BenchmarkTask, rules: Rule[]): TaskScore {
  const candidatePath = path.join(conditionDir, task.id, task.filePath)
  const code = fs.existsSync(candidatePath) ? fs.readFileSync(candidatePath, 'utf8') : ''
  const review = executeReviewCode(
    {
      code,
      focus: task.focus,
      minPriority: 'low'
    },
    rules
  )
  const issueSlugs = new Set(review.issues.map(issue => issue.rule))
  const fixedRules = task.expectedRules.filter(rule => !issueSlugs.has(rule))
  const missedRules = task.expectedRules.filter(rule => issueSlugs.has(rule))

  return {
    id: task.id,
    fixedRules,
    missedRules,
    residualIssues: review.issues.map(issue => issue.rule)
  }
}

function scoreCondition(rootDir: string, condition: string, rules: Rule[]): ConditionScore {
  const conditionDir = path.join(rootDir, condition)
  const tasks = TASKS.map(task => scoreTask(conditionDir, task, rules))
  const expectedCount = TASKS.reduce((total, task) => total + task.expectedRules.length, 0)
  const fixedCount = tasks.reduce((total, task) => total + task.fixedRules.length, 0)

  return {
    condition,
    fixedCount,
    expectedCount,
    score: fixedCount / expectedCount,
    tasks
  }
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function printCondition(score: ConditionScore): void {
  console.log(
    `${score.condition}: ${score.fixedCount}/${score.expectedCount} expected fixes (${formatPercent(score.score)})`
  )

  for (const task of score.tasks) {
    const status = task.missedRules.length === 0 ? 'pass' : 'miss'
    const misses = task.missedRules.length > 0 ? ` missed: ${task.missedRules.join(', ')}` : ''
    console.log(`  - ${task.id}: ${status}${misses}`)
  }
}

function scoreBenchmark(rootDir: string): BenchmarkScore {
  const rules: Rule[] = loadRules(WORKSPACE_RULES_DIR)
  const resolvedRoot = path.resolve(rootDir)
  const withoutMcp = scoreCondition(resolvedRoot, WITHOUT_MCP, rules)
  const withMcp = scoreCondition(resolvedRoot, WITH_MCP, rules)

  return {
    withoutMcp,
    withMcp,
    delta: withMcp.score - withoutMcp.score
  }
}

function printBenchmarkScore(score: BenchmarkScore): void {
  console.log('\nMCP Impact Benchmark')
  printCondition(score.withoutMcp)
  printCondition(score.withMcp)
  console.log(`delta: ${formatPercent(score.delta)}`)

  if (score.delta > 0) {
    console.log('result: MCP-assisted output fixed more expected issues.')
  } else if (score.delta < 0) {
    console.log('result: MCP-assisted output fixed fewer expected issues.')
  } else {
    console.log('result: no measured improvement from MCP access on this run.')
  }
}

function runSelfTest(): void {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-impact-'))

  try {
    initBenchmark(tempRoot)

    for (const task of TASKS) {
      writeTask(path.join(tempRoot, WITH_MCP), task, task.fixedCode)
    }

    const score = scoreBenchmark(tempRoot)
    printBenchmarkScore(score)

    if (score.withoutMcp.score !== 0 || score.withMcp.score !== 1 || score.delta !== 1) {
      throw new Error('Self-test failed: expected 0% without MCP and 100% with MCP fixtures.')
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
}

function main(): number {
  const args = process.argv.slice(2)
  const normalizedArgs = args[0] === '--' ? args.slice(1) : args
  const [command, targetDir] = normalizedArgs

  if (command === '--init' && targetDir) {
    initBenchmark(targetDir)
    return 0
  }

  if (command === '--score' && targetDir) {
    printBenchmarkScore(scoreBenchmark(targetDir))
    return 0
  }

  if (command === '--self-test') {
    runSelfTest()
    return 0
  }

  console.error(usage())
  return 1
}

process.exit(main())
