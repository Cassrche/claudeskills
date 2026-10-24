/**
 * Deprecated alias for the inline-link report workflow.
 *
 * Usage:
 *   pnpm inject:rule-links
 *
 * This command no longer edits files. Use `pnpm report:rule-links` directly.
 */

import { runReportRuleLinks } from './report-rule-links'

console.warn(
  'Deprecated: `pnpm inject:rule-links` is now a read-only review alias. Use `pnpm report:rule-links`.'
)

runReportRuleLinks(process.argv.slice(2)).catch(error => {
  console.error(error)
  process.exit(1)
})
