import * as rawBcd from '@mdn/browser-compat-data'
import { getCompatibleVersions } from 'baseline-browser-mapping'
import browserslist from 'browserslist'

const bcd = (rawBcd as any).default ?? rawBcd

const RULE_SUPPORT_FEATURE_MAP: Record<string, string> = {
  subgrid: 'css.properties.grid-template-columns.subgrid',
  'css-at-property': 'css.at-rules.property',
  'has-selector': 'css.selectors.has',
  'view-transitions': 'api.Document.startViewTransition',
  'container-queries': 'css.at-rules.container',
  'service-worker': 'api.ServiceWorker',
  'permissions-policy': 'http.headers.Permissions-Policy',
  'content-security-policy': 'http.headers.Content-Security-Policy',
  'referrer-policy': 'http.headers.Referrer-Policy',
  hsts: 'http.headers.Strict-Transport-Security'
}

const BROWSERSLIST_TO_BCD_BROWSER: Record<string, string> = {
  chrome: 'chrome',
  edge: 'edge',
  firefox: 'firefox',
  safari: 'safari',
  ios_saf: 'safari_ios',
  and_chr: 'chrome_android',
  and_ff: 'firefox_android',
  samsung: 'samsunginternet_android'
}

export interface RuleSupportData {
  featureId: string
  targetBrowsers: string[]
  unsupportedTargets: string[]
  baselineMinimums: Array<{ browser: string; version: string }>
}

function getByPath(target: any, path: string): any {
  return path.split('.').reduce((acc, key) => acc?.[key], target)
}

function compareVersions(left: string, right: string): number {
  const leftParts = left.split(/[.-]/).map(part => Number.parseInt(part, 10) || 0)
  const rightParts = right.split(/[.-]/).map(part => Number.parseInt(part, 10) || 0)
  const max = Math.max(leftParts.length, rightParts.length)

  for (let index = 0; index < max; index += 1) {
    const a = leftParts[index] ?? 0
    const b = rightParts[index] ?? 0
    if (a !== b) return a - b
  }

  return 0
}

function isSupportedByStatement(statement: any, version: string): boolean {
  if (!statement) return false
  if (statement.version_added === true) return true
  if (statement.version_added === false || statement.version_added == null) return false
  if (compareVersions(version, String(statement.version_added)) < 0) return false
  if (
    statement.version_removed &&
    compareVersions(version, String(statement.version_removed)) >= 0
  ) {
    return false
  }
  return true
}

function hasProjectSupport(featureId: string, targets: string[]): string[] {
  const compat = getByPath(bcd, featureId)?.__compat?.support
  if (!compat) return targets

  const unsupported: string[] = []

  for (const target of targets) {
    const [browser, version] = target.split(' ')
    const bcdBrowser = BROWSERSLIST_TO_BCD_BROWSER[browser]
    if (!bcdBrowser || !version) continue

    const support = compat[bcdBrowser]
    const statements = Array.isArray(support) ? support : [support]
    const supported = statements.some(statement => isSupportedByStatement(statement, version))

    if (!supported) {
      unsupported.push(target)
    }
  }

  return unsupported
}

export function getProjectBrowserQueries(cwd = process.cwd()): string[] {
  return browserslist.loadConfig({ path: cwd }) ?? browserslist.defaults
}

export function getProjectSupportedBrowsers(cwd = process.cwd()): string[] {
  return browserslist(getProjectBrowserQueries(cwd), { path: cwd, mobileToDesktop: false })
}

export function getRuleSupportData(slug: string, cwd = process.cwd()): RuleSupportData | null {
  const featureId = RULE_SUPPORT_FEATURE_MAP[slug]
  if (!featureId) return null

  const targetBrowsers = getProjectSupportedBrowsers(cwd)
  const unsupportedTargets = hasProjectSupport(featureId, targetBrowsers)
  const baselineMinimums = getCompatibleVersions({ suppressWarnings: true }).map(entry => ({
    browser: entry.browser,
    version: entry.version
  }))

  return {
    featureId,
    targetBrowsers,
    unsupportedTargets,
    baselineMinimums
  }
}
