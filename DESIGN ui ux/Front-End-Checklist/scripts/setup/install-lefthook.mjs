import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

if (!existsSync('.git')) {
  console.log('Skipping lefthook install: no git checkout found.')
  process.exit(0)
}

const result = spawnSync('lefthook', ['install'], { stdio: 'inherit' })

process.exit(result.status ?? 1)
