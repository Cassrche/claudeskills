/**
 * MCP quality pipeline: run unit tests and optional security scan for the MCP server.
 * See docs/mcp-quality.md for full tool list and manual steps (Inspector, MCP Doctor).
 *
 * Usage:
 *   pnpm mcp:audit           # tests + security scan
 *   pnpm mcp:audit --skip-security   # tests only
 *   pnpm mcp:audit:security  # security scan only (see package.json)
 */

import { spawnSync } from 'node:child_process'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '..', '..')
const MCP_SRC = path.join(ROOT, 'packages', 'mcp', 'src')

const args = process.argv.slice(2)
const skipSecurity = args.includes('--skip-security')

function run(
  title: string,
  command: string,
  cmdArgs: string[],
  cwd: string = ROOT
): { ok: boolean; code: number | null } {
  console.log(`\n--- ${title} ---\n`)
  const r = spawnSync(command, cmdArgs, {
    cwd,
    stdio: 'inherit',
    shell: true
  })
  const ok = r.status === 0
  return { ok, code: r.status }
}

function main(): number {
  console.log('MCP quality audit')
  console.log('Server: https://mcp.frontendchecklist.io')
  console.log('Code: packages/mcp (scan: packages/mcp/src)')

  // 1. Unit tests
  const testResult = run('MCP unit tests', 'pnpm', [
    'exec',
    'turbo',
    'test',
    '--filter=@repo/mcp',
    '--',
    '--ci',
    '--passWithNoTests'
  ])
  if (!testResult.ok) {
    console.error('\nMCP audit failed: unit tests failed.')
    return testResult.code ?? 1
  }

  // 2. Security scan (optional)
  if (!skipSecurity) {
    const securityResult = run(
      'Security scan (mcp-security-auditor)',
      'pnpm',
      ['dlx', 'mcp-security-auditor@latest', 'scan', MCP_SRC, '--fail-on', 'critical'],
      ROOT
    )
    if (!securityResult.ok) {
      console.error('\nMCP audit failed: security scan reported issues or could not run.')
      console.error('Check availability with: pnpm dlx mcp-security-auditor@latest --version')
      console.error('Skip security: pnpm mcp:audit --skip-security')
      return securityResult.code ?? 1
    }
  } else {
    console.log('\n--- Security scan skipped (--skip-security) ---\n')
  }

  console.log('\nMCP audit passed.')
  return 0
}

process.exit(main())
