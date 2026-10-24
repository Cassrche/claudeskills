import type { Priority } from '@repo/types'

export const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low']

export const PRIORITY_LABELS: Record<Priority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low'
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  critical: '#d32f2f',
  high: '#f57c00',
  medium: '#fbc02d',
  low: '#388e3c'
}

/**
 * Check if a string is a valid priority
 * @param priority - The priority string to validate
 * @returns True if valid priority
 */
export function isValidPriority(priority: string): priority is Priority {
  return PRIORITIES.includes(priority as Priority)
}
