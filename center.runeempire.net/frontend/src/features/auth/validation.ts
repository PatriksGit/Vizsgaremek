/*
 * Client-side checks that mirror the backend's rules, so most mistakes show up
 * before a request. The backend stays the authority on every one of them.
 */

/** Minecraft name: what Account::NAME_PATTERN accepts. */
const NAME_PATTERN = /^[A-Za-z0-9_]{3,16}$/

/** RegisterRequest::EMAIL_PATTERN: ASCII address with a dotted domain. */
const EMAIL_PATTERN = /^[\x21-\x3F\x41-\x7E]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/

/** PlayablePassword: no whitespace, § or control characters (untypeable in Minecraft chat). */
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const UNTYPEABLE_PATTERN = /[\s§\x00-\x1F\x7F]/

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 64
/** Backend defaults (REGISTRATION_CODE_LENGTH, REGISTRATION_CODE_EXPIRES_MINUTES); keep in sync if changed. */
export const CODE_LENGTH = 6
export const CODE_EXPIRES_MINUTES = 15

export type FieldErrors<Field extends string> = Partial<Record<Field, string>>

export function nameError(name: string): string | undefined {
  if (!name) return 'Add meg a játékosneved.'
  if (!NAME_PATTERN.test(name)) return '3–16 karakter lehet, csak betű, szám és aláhúzás (_).'
}

export function emailError(email: string): string | undefined {
  if (!email) return 'Add meg az e-mail címed.'
  if (!EMAIL_PATTERN.test(email.trim())) return 'Ez nem tűnik e-mail címnek.'
}

export function passwordError(password: string): string | undefined {
  if (!password) return 'Adj meg egy jelszót.'
  if (UNTYPEABLE_PATTERN.test(password)) return 'A jelszóban nem lehet szóköz vagy § jel.'
  if (password.length < PASSWORD_MIN_LENGTH) return `Legalább ${PASSWORD_MIN_LENGTH} karakter legyen.`
  if (password.length > PASSWORD_MAX_LENGTH) return `Legfeljebb ${PASSWORD_MAX_LENGTH} karakter lehet.`
}

export function hasErrors(errors: object): boolean {
  return Object.values(errors).some(Boolean)
}
