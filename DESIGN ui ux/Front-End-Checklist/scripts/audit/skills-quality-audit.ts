/**
 * Audit generated skills, rule coverage, and MCP readiness signals.
 *
 * The goal is to make Front-End Checklist measurable against stronger
 * agent-skill patterns: grounding, workflows, assessment questions,
 * validation checklists, references, and outcome-oriented rule coverage.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import type { CuratedChecklist } from '@repo/types'
import { getToolDefinitions } from '../../packages/mcp/src/server-tools'

interface SkillAudit {
  description: string
  hasAssessmentQuestions: boolean
  hasChecklist: boolean
  hasCodeExamples: boolean
  hasCoreSections: boolean
  hasDecisionCriteria: boolean
  hasGroundingUrl: boolean
  hasOutputContract: boolean
  hasProgressiveDisclosure: boolean
  hasReference: boolean
  hasSafetyBoundary: boolean
  hasVerification: boolean
  hasWorkflowLanguage: boolean
  score: number
  slug: string
}

interface GapCandidate {
  category: string
  keywords: string[]
  slug: string
  source: string
  title: string
}

interface GapResult extends GapCandidate {
  evidence: string[]
  status: 'covered' | 'partial' | 'missing'
}

interface ToolAnnotations {
  destructiveHint?: boolean
  idempotentHint?: boolean
  openWorldHint?: boolean
  readOnlyHint?: boolean
}

interface ToolDefinition {
  annotations?: ToolAnnotations
  description?: string
  inputSchema?: unknown
  name: string
  outputSchema?: unknown
}

interface McpToolAudit {
  annotated: number
  closedWorldExceptAuditUrl: boolean
  detailedDescriptions: number
  expectedPresent: number
  idempotent: number
  inputSchemas: number
  nonDestructive: number
  outputSchemas: number
  readOnly: number
  total: number
  uniqueNames: number
  validNames: number
}

const SKILLS_DIR = path.join(process.cwd(), 'skills')
const RULES_DIR = path.join(process.cwd(), 'packages/content/rules/en')

const GAP_CANDIDATES: GapCandidate[] = [
  {
    slug: 'trusted-types',
    title: 'Enforce Trusted Types for DOM XSS sinks',
    category: 'security',
    source: 'W3C Trusted Types / MDN CSP trusted-types',
    keywords: ['trusted types', 'trustedtypes', 'require-trusted-types-for']
  },
  {
    slug: 'html-sanitizer',
    title: 'Sanitize untrusted HTML before DOM insertion',
    category: 'security',
    source: 'MDN Sanitizer API / OWASP XSS Prevention',
    keywords: ['sanitizer', 'sanitize untrusted html', 'dompurify']
  },
  {
    slug: 'passkeys-webauthn',
    title: 'Support passkeys and WebAuthn-friendly authentication',
    category: 'security',
    source: 'web.dev passkeys / W3C WebAuthn',
    keywords: ['passkey', 'webauthn', 'publickeycredential']
  },
  {
    slug: 'content-visibility',
    title: 'Use content-visibility for large offscreen DOM sections',
    category: 'performance',
    source: 'web.dev content-visibility / MDN CSS containment',
    keywords: ['content-visibility', 'contain-intrinsic-size']
  },
  {
    slug: 'font-metric-overrides',
    title: 'Use font metric overrides to reduce font layout shift',
    category: 'performance',
    source: 'MDN @font-face descriptors / web.dev font best practices',
    keywords: ['size-adjust', 'ascent-override', 'descent-override', 'line-gap-override']
  },
  {
    slug: 'early-hints',
    title: 'Use 103 Early Hints for critical resource discovery',
    category: 'performance',
    source: 'MDN 103 Early Hints / web.dev resource loading',
    keywords: ['103 early hints', 'early hints']
  },
  {
    slug: 'client-hints',
    title: 'Use Client Hints deliberately and protect privacy',
    category: 'performance',
    source: 'MDN HTTP Client hints / WICG Client Hints',
    keywords: ['accept-ch', 'client hints', 'sec-ch']
  },
  {
    slug: 'prefers-reduced-data',
    title: 'Respect reduced data preferences',
    category: 'accessibility',
    source: 'MDN prefers-reduced-data / CSS Media Queries',
    keywords: ['prefers-reduced-data', 'save-data']
  },
  {
    slug: 'css-anchor-positioning',
    title: 'Use CSS anchor positioning for anchored overlays',
    category: 'css',
    source: 'MDN CSS anchor positioning',
    keywords: ['anchor positioning', 'anchor-name', 'position-anchor']
  },
  {
    slug: 'popover-api',
    title: 'Use the Popover API accessibly',
    category: 'html',
    source: 'MDN Popover API / HTML Standard',
    keywords: ['popover api', 'popovertarget', 'popover attribute']
  },
  {
    slug: 'dialog-element',
    title: 'Use native dialog semantics correctly',
    category: 'html',
    source: 'MDN HTMLDialogElement / WAI-ARIA dialog pattern',
    keywords: ['htmldialogelement', '<dialog', 'showmodal']
  },
  {
    slug: 'declarative-shadow-dom',
    title: 'Use declarative Shadow DOM safely for SSR components',
    category: 'html',
    source: 'MDN Declarative Shadow DOM / web.dev',
    keywords: ['declarative shadow dom', 'shadowrootmode']
  },
  {
    slug: 'private-network-access',
    title: 'Handle Private Network Access restrictions',
    category: 'security',
    source: 'WICG Private Network Access / Chrome Developers',
    keywords: ['private network access', 'access-control-request-private-network']
  },
  {
    slug: 'attribution-reporting',
    title: 'Use Attribution Reporting with privacy constraints',
    category: 'privacy',
    source: 'Privacy Sandbox Attribution Reporting',
    keywords: ['attribution reporting', 'attributionsrc']
  },
  {
    slug: 'long-animation-frames',
    title: 'Use Long Animation Frames data to diagnose slow interactions',
    category: 'performance',
    source: 'W3C Long Animation Frames / Chrome Developers INP guidance',
    keywords: ['long animation frame', 'long-animation-frame', 'loaf']
  },
  {
    slug: 'bfcache-eligibility',
    title: 'Keep pages eligible for the back-forward cache',
    category: 'performance',
    source: 'web.dev bfcache / Chrome DevTools',
    keywords: ['bfcache', 'back-forward cache', 'pageshow']
  },
  {
    slug: 'scheduler-posttask',
    title: 'Use task scheduling APIs to prioritize responsive work',
    category: 'javascript',
    source: 'WICG Scheduling APIs / MDN scheduler',
    keywords: ['scheduler.posttask', 'scheduler.yield', 'prioritized task scheduling']
  },
  {
    slug: 'fedcm',
    title: 'Use FedCM for privacy-preserving federated sign-in',
    category: 'privacy',
    source: 'FedCM / Privacy Sandbox',
    keywords: ['fedcm', 'federated credential management', 'identitycredential']
  }
]

const EXPECTED_MCP_TOOLS = new Set([
  'audit_url',
  'check_rule',
  'explain_rule',
  'fix_rule',
  'get_checklist_rules',
  'get_quick_reference',
  'get_rule',
  'get_workflow',
  'list_categories',
  'review_code',
  'search_rules'
])

function walkFiles(dir: string, filename: string): string[] {
  if (!fs.existsSync(dir)) {
    return []
  }

  const results: string[] = []
  for (const entry of fs.readdirSync(dir)) {
    const entryPath = path.join(dir, entry)
    const stat = fs.statSync(entryPath)
    if (stat.isDirectory()) {
      results.push(...walkFiles(entryPath, filename))
    } else if (entry === filename) {
      results.push(entryPath)
    }
  }

  return results
}

function read(filePath: string): string {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : ''
}

function parseFrontmatterValue(content: string, key: string): string {
  const match = content.match(new RegExp(`^${key}:\\s*"?([^"\\n]+)"?`, 'm'))
  return match?.[1]?.trim() ?? ''
}

function scoreSkill(skillPath: string): SkillAudit {
  const slug = path.basename(path.dirname(skillPath))
  const skill = read(skillPath)
  const referencePath = path.join(path.dirname(skillPath), 'references', 'rule.md')
  const reference = read(referencePath)
  const combined = `${skill}\n${reference}`
  const description = parseFrontmatterValue(skill, 'description')

  const hasCoreSections =
    skill.includes('## Check') && skill.includes('## Fix') && skill.includes('## Explain')
  const hasReference = reference.length > 0
  const hasGroundingUrl = /url:\s*https:\/\/frontendchecklist\.io/.test(skill)
  const hasChecklist = /(^|\n)\s*- \[[ x]\]/i.test(combined)
  const hasAssessmentQuestions = /\?/.test(skill) || /assessment questions?/i.test(combined)
  const hasVerification = /## Verification|### Automated Checks|### Manual Checks/i.test(reference)
  const hasCodeExamples = /```/.test(reference)
  const hasWorkflowLanguage = /workflow|before|step|first|then|verify|measure/i.test(skill)
  const hasDecisionCriteria = /when to|only if|unless|avoid|do not|never|exception|caveat/i.test(
    combined
  )
  const hasOutputContract = /output|return|final answer|format|schema|severity|file.+line/i.test(
    combined
  )
  const hasProgressiveDisclosure =
    hasReference && /references?\/|load .*references?|see .*\.md|as needed/i.test(skill)
  const hasSafetyBoundary =
    /secret|credential|token|permission|destructive|trusted|untrusted|consent|security|privacy|never/i.test(
      combined
    )

  let score = 0
  if (description.startsWith('Use when')) score += 10
  if (description.length >= 80) score += 10
  if (hasCoreSections) score += 20
  if (hasReference) score += 15
  if (hasGroundingUrl) score += 10
  if (hasVerification) score += 10
  if (hasCodeExamples) score += 10
  if (hasChecklist) score += 5
  if (hasAssessmentQuestions) score += 5
  if (hasWorkflowLanguage) score += 5

  return {
    description,
    hasAssessmentQuestions,
    hasChecklist,
    hasCodeExamples,
    hasCoreSections,
    hasDecisionCriteria,
    hasGroundingUrl,
    hasOutputContract,
    hasProgressiveDisclosure,
    hasReference,
    hasSafetyBoundary,
    hasVerification,
    hasWorkflowLanguage,
    score,
    slug
  }
}

function loadRuleCorpus(): string {
  if (!fs.existsSync(RULES_DIR)) {
    return ''
  }

  return fs
    .readdirSync(RULES_DIR)
    .flatMap(category => {
      const categoryDir = path.join(RULES_DIR, category)
      if (!fs.statSync(categoryDir).isDirectory()) return []
      return fs
        .readdirSync(categoryDir)
        .filter(file => file.endsWith('.mdx'))
        .map(file => {
          const slug = file.replace(/\.mdx$/, '')
          return `${category}/${slug}\n${read(path.join(categoryDir, file))}`
        })
    })
    .join('\n')
    .toLowerCase()
}

function evaluateGap(candidate: GapCandidate, corpus: string): GapResult {
  const directSlug = corpus.includes(candidate.slug)
  const evidence = candidate.keywords.filter(keyword => corpus.includes(keyword.toLowerCase()))

  let status: GapResult['status'] = 'missing'
  if (directSlug || evidence.length === candidate.keywords.length) {
    status = 'covered'
  } else if (evidence.length > 0) {
    status = 'partial'
  }

  return {
    ...candidate,
    evidence,
    status
  }
}

function percent(count: number, total: number): string {
  return `${Math.round((count / Math.max(total, 1)) * 100)}%`
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

function buildMockChecklist(): CuratedChecklist {
  return {
    id: 'quality-radar',
    slug: 'quality-radar',
    title: 'Quality Radar',
    description: 'Checklist fixture used to expose dynamic MCP workflow tools during audits.',
    icon: 'radar',
    rules: ['accessibility/alt-text'],
    estimatedTime: '5 min',
    difficulty: 'beginner',
    language: 'en',
    url: 'https://frontendchecklist.io/checklists/quality-radar'
  }
}

function auditMcpTools(): McpToolAudit {
  const tools = getToolDefinitions([buildMockChecklist()]) as ToolDefinition[]
  const names = tools.map(tool => tool.name)
  const uniqueNames = new Set(names).size
  const validNamePattern = /^[A-Za-z0-9_.-]{1,128}$/

  return {
    annotated: tools.filter(tool => Boolean(tool.annotations)).length,
    closedWorldExceptAuditUrl: tools.every(tool =>
      tool.name === 'audit_url'
        ? tool.annotations?.openWorldHint === true
        : tool.annotations?.openWorldHint === false
    ),
    detailedDescriptions: tools.filter(
      tool =>
        typeof tool.description === 'string' &&
        tool.description.length >= 80 &&
        /use|workflow|first|when/i.test(tool.description)
    ).length,
    expectedPresent: [...EXPECTED_MCP_TOOLS].filter(name => names.includes(name)).length,
    idempotent: tools.filter(tool => tool.annotations?.idempotentHint === true).length,
    inputSchemas: tools.filter(tool => Boolean(tool.inputSchema)).length,
    nonDestructive: tools.filter(tool => tool.annotations?.destructiveHint === false).length,
    outputSchemas: tools.filter(tool => Boolean(tool.outputSchema)).length,
    readOnly: tools.filter(tool => tool.annotations?.readOnlyHint === true).length,
    total: tools.length,
    uniqueNames,
    validNames: tools.filter(tool => validNamePattern.test(tool.name)).length
  }
}

function printTopSkills(title: string, skills: SkillAudit[]): void {
  console.log(`\n${title}`)
  for (const skill of skills.slice(0, 10)) {
    console.log(`- ${skill.slug}: ${skill.score}`)
  }
}

function main(): number {
  const skillPaths = walkFiles(SKILLS_DIR, 'SKILL.md')
  const skills = skillPaths.map(scoreSkill)
  const corpus = loadRuleCorpus()
  const gaps = GAP_CANDIDATES.map(candidate => evaluateGap(candidate, corpus))
  const mcpTools = auditMcpTools()

  const total = skills.length
  const average = skills.reduce((sum, skill) => sum + skill.score, 0) / Math.max(skills.length, 1)
  const scores = skills.map(skill => skill.score)
  const excellent = skills.filter(skill => skill.score >= 90).length
  const weak = skills.filter(skill => skill.score < 75)

  const checklistCount = skills.filter(skill => skill.hasChecklist).length
  const assessmentCount = skills.filter(skill => skill.hasAssessmentQuestions).length
  const verificationCount = skills.filter(skill => skill.hasVerification).length
  const workflowCount = skills.filter(skill => skill.hasWorkflowLanguage).length
  const codeExampleCount = skills.filter(skill => skill.hasCodeExamples).length
  const decisionCriteriaCount = skills.filter(skill => skill.hasDecisionCriteria).length
  const outputContractCount = skills.filter(skill => skill.hasOutputContract).length
  const progressiveDisclosureCount = skills.filter(skill => skill.hasProgressiveDisclosure).length
  const safetyBoundaryCount = skills.filter(skill => skill.hasSafetyBoundary).length

  const missing = gaps.filter(gap => gap.status === 'missing')
  const partial = gaps.filter(gap => gap.status === 'partial')
  const covered = gaps.filter(gap => gap.status === 'covered')

  console.log('\nFrontend Checklist Quality Radar')
  console.log(`Skills checked           : ${total}`)
  console.log(`Average skill score      : ${average.toFixed(1)}/100`)
  console.log(`Median skill score       : ${median(scores)}/100`)
  console.log(`Excellent skills (>=90)  : ${excellent} (${percent(excellent, total)})`)
  console.log(`Weak skills (<75)        : ${weak.length} (${percent(weak.length, total)})`)
  console.log('')
  console.log('Google-style skill pattern adoption')
  console.log(
    `- Reference directory    : ${percent(skills.filter(skill => skill.hasReference).length, total)}`
  )
  console.log(
    `- Grounding URL          : ${percent(skills.filter(skill => skill.hasGroundingUrl).length, total)}`
  )
  console.log(`- Verification guidance  : ${percent(verificationCount, total)}`)
  console.log(`- Code examples          : ${percent(codeExampleCount, total)}`)
  console.log(`- Workflow language      : ${percent(workflowCount, total)}`)
  console.log(`- Assessment questions   : ${percent(assessmentCount, total)}`)
  console.log(`- Validation checklists  : ${percent(checklistCount, total)}`)
  console.log('')
  console.log('Ecosystem readiness signals')
  console.log(`- Decision criteria      : ${percent(decisionCriteriaCount, total)}`)
  console.log(`- Output contracts       : ${percent(outputContractCount, total)}`)
  console.log(`- Progressive disclosure : ${percent(progressiveDisclosureCount, total)}`)
  console.log(`- Safety boundaries      : ${percent(safetyBoundaryCount, total)}`)
  console.log('')
  console.log('MCP tool contract radar')
  console.log(`- Expected tools         : ${mcpTools.expectedPresent}/${EXPECTED_MCP_TOOLS.size}`)
  console.log(`- Unique tool names      : ${mcpTools.uniqueNames}/${mcpTools.total}`)
  console.log(`- Valid MCP names        : ${mcpTools.validNames}/${mcpTools.total}`)
  console.log(`- Input schemas          : ${mcpTools.inputSchemas}/${mcpTools.total}`)
  console.log(`- Output schemas         : ${mcpTools.outputSchemas}/${mcpTools.total}`)
  console.log(`- Tool annotations       : ${mcpTools.annotated}/${mcpTools.total}`)
  console.log(`- Read-only hints        : ${mcpTools.readOnly}/${mcpTools.total}`)
  console.log(`- Non-destructive hints  : ${mcpTools.nonDestructive}/${mcpTools.total}`)
  console.log(`- Idempotent hints       : ${mcpTools.idempotent}/${mcpTools.total}`)
  console.log(`- Open-world scoped      : ${mcpTools.closedWorldExceptAuditUrl ? 'pass' : 'fail'}`)
  console.log(`- Agent descriptions     : ${mcpTools.detailedDescriptions}/${mcpTools.total}`)
  console.log('')
  console.log('Rule gap radar')
  console.log(`- Covered candidates     : ${covered.length}/${gaps.length}`)
  console.log(`- Partial candidates     : ${partial.length}/${gaps.length}`)
  console.log(`- Missing candidates     : ${missing.length}/${gaps.length}`)

  if (missing.length > 0) {
    console.log('\nHigh-value missing rule candidates')
    for (const gap of missing) {
      console.log(`- ${gap.category}/${gap.slug}: ${gap.title} (${gap.source})`)
    }
  }

  if (partial.length > 0) {
    console.log('\nPartial coverage candidates')
    for (const gap of partial) {
      console.log(
        `- ${gap.category}/${gap.slug}: ${gap.title}; evidence: ${gap.evidence.join(', ')}`
      )
    }
  }

  printTopSkills(
    'Lowest scoring skills',
    [...skills].sort((a, b) => a.score - b.score)
  )
  printTopSkills(
    'Highest scoring skills',
    [...skills].sort((a, b) => b.score - a.score)
  )

  return 0
}

process.exit(main())
