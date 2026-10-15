import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'

import { ApiError, GENERIC_ERROR } from '@/lib/api'

/** The message for the form as a whole; the backend's messages are already in Hungarian. */
export function formMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : GENERIC_ERROR
}

/**
 * Puts a failed request's messages on the form: each backend key on its form
 * field, everything else (a key without a field, or no field errors at all)
 * on the form as a whole, as root.server.
 */
export function applyApiError<Values extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<Values>,
  fieldFor: Partial<Record<string, Path<Values>>>,
): void {
  const fieldErrors = error instanceof ApiError ? error.fieldErrors : {}
  const unmatched: string[] = []

  for (const [key, message] of Object.entries(fieldErrors)) {
    const field = fieldFor[key]
    if (field) {
      setError(field, { message })
    } else {
      unmatched.push(message)
    }
  }

  if (Object.keys(fieldErrors).length === 0) unmatched.push(formMessage(error))
  if (unmatched.length > 0) setError('root.server', { message: unmatched.join(' ') })
}
