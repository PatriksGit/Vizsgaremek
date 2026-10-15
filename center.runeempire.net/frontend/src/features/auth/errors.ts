import { ApiError } from '@/lib/api'

/** The message for the form as a whole; the backend's messages are already in Hungarian. */
export function formMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Váratlan hiba történt, próbáld újra később.'
}

/**
 * Splits a failed request into per-field messages (backend key → form field)
 * and one message for the form. Nothing is dropped: a field error without a
 * matching form field lands in the form message.
 */
export function mapApiError<Field extends string>(
  error: unknown,
  fieldFor: Partial<Record<string, Field>>,
): { fieldErrors: Partial<Record<Field, string>>; formError?: string } {
  if (!(error instanceof ApiError) || Object.keys(error.fieldErrors).length === 0) {
    return { fieldErrors: {}, formError: formMessage(error) }
  }

  const fieldErrors: Partial<Record<Field, string>> = {}
  const unmatched: string[] = []

  for (const [key, message] of Object.entries(error.fieldErrors)) {
    const field = fieldFor[key]
    if (field) {
      fieldErrors[field] ??= message
    } else {
      unmatched.push(message)
    }
  }

  return { fieldErrors, formError: unmatched[0] }
}
