import { EMAIL_PATTERN } from '@/features/auth/schemas'

/** The texts of the management sign-in errors, by the backend's stable code. The code itself is never shown. */
const GENERIC_ERROR_TEXT = 'A belépés nem sikerült.'

const ERROR_TEXTS: Record<string, string> = {
  'management.not_allowed': 'Ez az e-mail cím nem jogosult a belépésre.',
  'management.email_unverified': 'Ezt a Google-fiókot a Google nem igazolta, válassz egy másikat.',
  'management.google_failed': 'A Google-belépés most nem sikerült, próbáld újra.',
  'management.google_unavailable': 'A Google-belépés most nincs beállítva.',
  'management.forbidden': 'Ehhez nincs jogosultságod.',
  // The backend's generic 429 text, word for word.
  too_many_requests: 'Túl sok próbálkozás, próbáld újra később.',
}

/** A lookup only: an unknown (or hostile) code gets the fallback, by default the generic text. */
export function errorText(code: string | null | undefined, fallback = GENERIC_ERROR_TEXT): string {
  return (code && Object.hasOwn(ERROR_TEXTS, code) && ERROR_TEXTS[code]) || fallback
}

/**
 * Whether ?email= looks like an e-mail address (the backend's Account::EMAIL_PATTERN, ASCII only):
 * anything else in the link is left out, not shown as "the address you tried".
 */
export function isEmailAddress(value: string): boolean {
  return EMAIL_PATTERN.test(value)
}
