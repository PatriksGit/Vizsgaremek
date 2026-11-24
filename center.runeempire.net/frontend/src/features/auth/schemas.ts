import { z } from 'zod'

/*
 * Client-side checks that mirror the backend's rules, so most mistakes show up
 * before a request. The backend stays the authority on every one of them.
 */

/** Minecraft name: what Account::NAME_PATTERN accepts. */
export const NAME_PATTERN = /^[A-Za-z0-9_]{3,16}$/

/** Account::EMAIL_PATTERN: ASCII address with a dotted domain. */
export const EMAIL_PATTERN = /^[\x21-\x3F\x41-\x7E]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/

/**
 * PlayablePassword::ALLOWED_PATTERN: what a keyboard types -- the English letters,
 * digits and plain symbols (printable ASCII without the space: the in-game
 * `/login <jelszó>` splits at it) plus the Hungarian accented letters. No emoji,
 * copied symbols, other alphabets or separate accent marks.
 */
export const ALLOWED_PASSWORD_PATTERN = /^[\x21-\x7EáéíóöőúüűÁÉÍÓÖŐÚÜŰ]+$/

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 64
/** Backend default (REGISTRATION_CODE_LENGTH); keep in sync if changed. */
export const CODE_LENGTH = 6
/** An authenticator app's code: always 6 digits (the TOTP contract with RuneAuth), whatever the e-mail codes are. */
export const TOTP_LENGTH = 6

/**
 * The allowed symbols' example in every password text (the field hints, the Beállítások checklist, the error), with
 * no-break spaces: it broke into "(pl. ! @ #" / "_ -)" on phones (review 2026-11-23, V7).
 */
export const PASSWORD_EXAMPLE = '(pl.\u00a0!\u00a0@\u00a0#\u00a0_\u00a0-)'

/** The new-password field's hint (registration, forgotten password). */
export const PASSWORD_HINT =
  `Min. ${PASSWORD_MIN_LENGTH} karakter, szóköz nélkül: magyar vagy angol betűk, számok és alap jelek ${PASSWORD_EXAMPLE}.`

/** The resend toast (registration, forgotten password). */
export const CODE_RESENT_MESSAGE = 'Új kódot küldtünk. A korábbi kód már nem érvényes.'

/** The new password typed twice must match (registration, reset, change). */
const passwordsMatch = (values: { password: string; passwordConfirmation: string }) =>
  values.password === values.passwordConfirmation
const passwordsDiffer = { error: 'A két jelszó nem egyezik.', path: ['passwordConfirmation'] }

/** A code of `length` digits: the e-mailed one or an authenticator app's. */
const digitCode = (length: number) =>
  z.object({ code: z.string().regex(new RegExp(`^\\d{${length}}$`), { error: `Írd be mind a ${length} számjegyet.` }) })

export const loginSchema = z.object({
  username: z.string().trim().min(1, { error: 'Add meg a játékosneved.' }),
  password: z.string().min(1, { error: 'Add meg a jelszavad.' }),
})

export type LoginValues = z.infer<typeof loginSchema>

const password = z
  .string()
  .min(1, { error: 'Adj meg egy jelszót.' })
  .refine((value) => ALLOWED_PASSWORD_PATTERN.test(value), {
    error: `Csak magyar vagy angol betűket, számokat és alap jeleket ${PASSWORD_EXAMPLE} tartalmazhat, szóközt nem.`,
  })
  // Every allowed character is one UTF-16 unit, so .length counts characters like the backend.
  .refine((value) => value.length >= PASSWORD_MIN_LENGTH, { error: `Legalább ${PASSWORD_MIN_LENGTH} karakter legyen.` })
  .refine((value) => value.length <= PASSWORD_MAX_LENGTH, { error: `Legfeljebb ${PASSWORD_MAX_LENGTH} karakter lehet.` })

const email = z
  .string()
  .trim()
  .min(1, { error: 'Add meg az e-mail címed.' })
  .regex(EMAIL_PATTERN, { error: 'Ez nem tűnik e-mail címnek.' })

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { error: 'Add meg a játékosneved.' })
      .regex(NAME_PATTERN, { error: '3–16 karakter lehet, csak betű, szám és aláhúzás (_).' }),
    email,
    password,
    passwordConfirmation: z.string(),
    termsAccepted: z.boolean().refine((accepted) => accepted, { error: 'A regisztrációhoz el kell fogadnod az ÁSZF-et.' }),
    ageConfirmed: z.boolean().refine((confirmed) => confirmed, {
      error: 'A regisztrációhoz 16 évesnek kell lenned, vagy a szülőd hozzájárulása kell.',
    }),
    /** The hidden bot trap (HoneypotField): only a bot ticks it. */
    newsletter: z.boolean().optional(),
  })
  .refine(passwordsMatch, passwordsDiffer)

export type RegisterValues = z.infer<typeof registerSchema>

/** Backend error keys of POST /auth/register → fields of the registration form. */
export const registerFieldForKey: Partial<Record<string, keyof RegisterValues>> = {
  display_name: 'name',
  email: 'email',
  password: 'password',
  terms: 'termsAccepted',
  age_confirmed: 'ageConfirmed',
}

export const codeSchema = digitCode(CODE_LENGTH)

export type CodeValues = z.infer<typeof codeSchema>

/** The forgotten password panel, step 1: the account's e-mail address. */
export const forgotEmailSchema = z.object({ email, newsletter: z.boolean().optional() })

export type ForgotEmailValues = z.infer<typeof forgotEmailSchema>

/**
 * The forgotten password panel, last step: the new password, typed twice, and
 * for a 2FA account its authenticator code (the panel checks that one, since
 * only the code step knows whether it is needed).
 */
export const newPasswordSchema = z
  .object({ password, passwordConfirmation: z.string(), twoFactorCode: z.string().optional() })
  .refine(passwordsMatch, passwordsDiffer)

export type NewPasswordValues = z.infer<typeof newPasswordSchema>

/** The Beállítások page's password change: the current password, then the new one twice. */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: 'Add meg a jelenlegi jelszavad.' }),
    password,
    passwordConfirmation: z.string(),
  })
  .refine(passwordsMatch, passwordsDiffer)
  // The backend's `different` rule, with its message.
  .refine((values) => values.password !== values.currentPassword, {
    error: 'Az új jelszó nem lehet ugyanaz, mint a jelenlegi.',
    path: ['password'],
  })

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>

/** An authenticator app's 6-digit code (login step, switching 2FA on and off). Same shape as the e-mail code's form. */
export const totpSchema = digitCode(TOTP_LENGTH)
