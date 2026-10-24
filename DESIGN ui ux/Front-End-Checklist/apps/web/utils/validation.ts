/** Validates that a string matches a basic email pattern. */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/** Validates that a string is a parseable URL. */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/** Validates that a string looks like a phone number (10+ digits, optional formatting). */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s-()]+$/
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10
}

/** Returns true if the value is non-empty (handles strings, arrays, null, and undefined). */
export function isRequired(value: any): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

/** Returns true if the string length is at least `min`. */
export function minLength(value: string, min: number): boolean {
  return value.length >= min
}

/** Returns true if the string length is at most `max`. */
export function maxLength(value: string, max: number): boolean {
  return value.length <= max
}
