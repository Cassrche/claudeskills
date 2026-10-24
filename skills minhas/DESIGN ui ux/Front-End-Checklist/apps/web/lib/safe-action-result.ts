interface SafeActionValidationErrors {
  formErrors?: string[]
  fieldErrors?: Record<string, string[] | undefined>
}

interface SafeActionResultShape {
  serverError?: string
  validationErrors?: SafeActionValidationErrors
}

/**
 * Extract the most useful human-readable error message from a safe action result.
 *
 * @param result - Result returned by a safe action hook execution.
 * @param fallback - Message used when the result has no specific error details.
 * @returns A user-facing error message.
 */
export function getSafeActionErrorMessage(result: SafeActionResultShape, fallback: string): string {
  if (result.serverError) {
    return result.serverError
  }

  const formError = result.validationErrors?.formErrors?.[0]
  if (formError) {
    return formError
  }

  const fieldError = Object.values(result.validationErrors?.fieldErrors ?? {}).find(
    value => value && value.length > 0
  )?.[0]

  return fieldError ?? fallback
}
