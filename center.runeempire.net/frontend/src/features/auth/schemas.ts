import { z } from 'zod'

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
/** Backend default (REGISTRATION_CODE_LENGTH); keep in sync if changed. */
export const CODE_LENGTH = 6

export const loginSchema = z.object({
  username: z.string().trim().min(1, { error: 'Add meg a játékosneved.' }),
  password: z.string().min(1, { error: 'Add meg a jelszavad.' }),
})

export type LoginValues = z.infer<typeof loginSchema>

const password = z
  .string()
  .min(1, { error: 'Adj meg egy jelszót.' })
  .refine((value) => !UNTYPEABLE_PATTERN.test(value), { error: 'A jelszóban nem lehet szóköz vagy § jel.' })
  // The minimum counts characters like the backend (mb_strlen), the maximum
  // UTF-16 units like the plugin, so an emoji counts once and twice.
  .refine((value) => [...value].length >= PASSWORD_MIN_LENGTH, { error: `Legalább ${PASSWORD_MIN_LENGTH} karakter legyen.` })
  .refine((value) => value.length <= PASSWORD_MAX_LENGTH, { error: `Legfeljebb ${PASSWORD_MAX_LENGTH} karakter lehet.` })

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { error: 'Add meg a játékosneved.' })
      .regex(NAME_PATTERN, { error: '3–16 karakter lehet, csak betű, szám és aláhúzás (_).' }),
    email: z
      .string()
      .trim()
      .min(1, { error: 'Add meg az e-mail címed.' })
      .regex(EMAIL_PATTERN, { error: 'Ez nem tűnik e-mail címnek.' }),
    password,
    passwordConfirmation: z.string(),
    termsAccepted: z.boolean().refine((accepted) => accepted, { error: 'A regisztrációhoz el kell fogadnod az ÁSZF-et.' }),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    error: 'A két jelszó nem egyezik.',
    path: ['passwordConfirmation'],
  })

export type RegisterValues = z.infer<typeof registerSchema>

/** Backend error keys of POST /auth/register → fields of the registration form. */
export const registerFieldForKey: Partial<Record<string, keyof RegisterValues>> = {
  display_name: 'name',
  email: 'email',
  password: 'password',
  terms: 'termsAccepted',
}

export const codeSchema = z.object({
  code: z.string().regex(new RegExp(`^\\d{${CODE_LENGTH}}$`), { error: `Írd be mind a ${CODE_LENGTH} számjegyet.` }),
})

export type CodeValues = z.infer<typeof codeSchema>
