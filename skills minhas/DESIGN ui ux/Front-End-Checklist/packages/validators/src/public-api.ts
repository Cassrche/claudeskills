export { validateImports } from './validate-imports'
export { validateSecurity } from './validate-security'
export { validateTypes } from './validate-types'

import chalk from 'chalk'
import { validateImports } from './validate-imports'
import { validateSecurity } from './validate-security'
import { validateTypes } from './validate-types'

/**
 * Run every validator against a file list and report the aggregate result.
 *
 * @param files - Files to validate.
 * @returns Whether every validator passed.
 */
export async function validateAll(files: string[]) {
  // Using process.stdout.write for validation output is intentional
  process.stdout.write(chalk.blue('\n🔍 Running comprehensive validation...\n\n'))

  let hasErrors = false

  process.stdout.write(chalk.cyan('📦 Validating imports...\n'))
  const importsValid = validateImports(files)
  if (!importsValid) hasErrors = true

  process.stdout.write(chalk.cyan('\n🔤 Validating types...\n'))
  const typesValid = validateTypes(files)
  if (!typesValid) hasErrors = true

  process.stdout.write(chalk.cyan('\n🔒 Validating security...\n'))
  const securityValid = validateSecurity(files)
  if (!securityValid) hasErrors = true

  if (!hasErrors) {
    process.stdout.write(chalk.green.bold('\n✅ All validations passed!\n\n'))
  } else {
    process.stdout.write(chalk.red.bold('\n❌ Validation failed. Please fix the issues above.\n\n'))
  }

  return !hasErrors
}
