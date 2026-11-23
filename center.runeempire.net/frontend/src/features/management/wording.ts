/** The texts of the management sign-in errors, by the backend's stable code. The code itself is never shown. */
export const GENERIC_ERROR_TEXT = 'A belépés nem sikerült.'

const ERROR_TEXTS: Record<string, string> = {
  'management.not_allowed': 'Ez az e-mail cím nem jogosult a belépésre.',
  'management.email_unverified': 'Ezt a Google-fiókot a Google nem igazolta, válassz egy másikat.',
  'management.google_failed': 'A Google-belépés most nem sikerült, próbáld újra.',
  'management.google_unavailable': 'A Google-belépés most nincs beállítva.',
  'management.forbidden': 'Ehhez nincs jogosultságod.',
  // The backend's generic 429 text, word for word.
  too_many_requests: 'Túl sok próbálkozás, próbáld újra később.',
}

/** A lookup only: an unknown (or hostile) code gets the generic text. */
export function errorText(code: string | null | undefined): string {
  return (code && Object.hasOwn(ERROR_TEXTS, code) && ERROR_TEXTS[code]) || GENERIC_ERROR_TEXT
}

/**
 * Whether ?email= looks like an e-mail address (the backend's Account::EMAIL_PATTERN, ASCII only):
 * anything else in the link is left out, not shown as "the address you tried".
 */
export function isEmailAddress(value: string): boolean {
  return /^[\x21-\x3F\x41-\x7E]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(value)
}
