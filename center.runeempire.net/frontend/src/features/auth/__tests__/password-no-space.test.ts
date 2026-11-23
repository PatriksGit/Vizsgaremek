/**
 * New passwords may not contain a space (owner, 2026-11-16): the in-game
 * `/login <jelszó>` command splits at it. Mirrors App\Rules\PlayablePassword.
 */
import { describe, expect, it } from 'vitest'

import { newPasswordSchema, PASSWORD_EXAMPLE } from '@/features/auth/schemas'

const NO_SPACE = `Csak magyar vagy angol betűket, számokat és alap jeleket ${PASSWORD_EXAMPLE} tartalmazhat, szóközt nem.`

const errorOf = (password: string) => {
  const result = newPasswordSchema.safeParse({ password, passwordConfirmation: password })
  return result.success ? null : result.error.issues.find((issue) => issue.path[0] === 'password')?.message
}

describe('a new password', () => {
  it.each(['titkos jelszo', 'titkosjelszo ', ' titkosjelszo'])('"%s" is refused for its space', (password) => {
    expect(errorOf(password)).toBe(NO_SPACE)
  })

  it('the symbols example never breaks: no-break spaces only (review 2026-11-23 V7)', () => {
    expect(PASSWORD_EXAMPLE).not.toContain(' ')
    expect(PASSWORD_EXAMPLE).toBe('(pl.\u00a0!\u00a0@\u00a0#\u00a0_\u00a0-)')
  })

  it('without a space, with symbols and accented letters, is fine', () => {
    expect(errorOf('Árvíztűrő-2026!')).toBeNull()
  })
})
