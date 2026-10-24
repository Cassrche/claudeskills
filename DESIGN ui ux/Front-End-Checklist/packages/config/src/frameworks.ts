export const CHECKLIST_FRAMEWORKS = ['vite', 'nextjs', 'astro', 'sveltekit', 'react'] as const

const CHECKLIST_FRAMEWORK_SET = new Set<string>(CHECKLIST_FRAMEWORKS)

/**
 * Check whether a value matches one of the supported checklist frameworks.
 *
 * @param value - Unknown framework value.
 * @returns True when the value is a supported checklist framework.
 */
export function isChecklistFramework(
  value: unknown
): value is (typeof CHECKLIST_FRAMEWORKS)[number] {
  return typeof value === 'string' && CHECKLIST_FRAMEWORK_SET.has(value)
}
