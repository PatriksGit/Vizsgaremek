/**
 * New passwords may not contain a space (owner, 2026-11-16): the in-game
 * `/login <jelszó>` command splits at it. Mirrors App\Rules\PlayablePassword.
 */
import { describe, expect, it } from 'vitest'

import { newPasswordSchema } from '@/features/auth/schemas'

const NO_SPACE = 'Csak magyar vagy angol betűket, számokat és alap jeleket (pl. ! @ # _ -) tartalmazhat, szóközt nem.'

const errorOf = (password: string) => {
  const result = newPasswordSchema.safeParse({ password, passwordConfirmation: password })
  return result.success ? null : result.error.issues.find((issue) => issue.path[0] === 'password')?.message
}

describe('a new password', () => {
  it.each(['titkos jelszo', 'titkosjelszo ', ' titkosjelszo'])('"%s" is refused for its space', (password) => {
    expect(errorOf(password)).toBe(NO_SPACE)
  })

  it('without a space, with symbols and accented letters, is fine', () => {
    expect(errorOf('Árvíztűrő-2026!')).toBeNull()
  })
})
