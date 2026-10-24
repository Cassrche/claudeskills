import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRulesDir = path.resolve(packageRoot, '../content/rules/en')
const targetRulesDir = path.resolve(packageRoot, 'rules/en')

if (!fs.existsSync(sourceRulesDir)) {
  throw new Error(`Source rules directory not found: ${sourceRulesDir}`)
}

fs.rmSync(path.resolve(packageRoot, 'rules'), { recursive: true, force: true })
fs.mkdirSync(path.dirname(targetRulesDir), { recursive: true })
fs.cpSync(sourceRulesDir, targetRulesDir, { recursive: true })

process.stdout.write(`Copied public rules into ${targetRulesDir}\n`)
