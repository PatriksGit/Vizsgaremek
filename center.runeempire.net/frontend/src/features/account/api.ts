import { http } from '@/lib/api'

/*
 * The Beállítások page's calls: only features/account uses them (review 2026-11-23 AUTH-S2).
 * Each goes through useMutation in its caller, so a 401 forgets the account (src/queryClient.ts).
 */

type Wrapped<T> = { data: T }

/**
 * Changes the logged-in player's password. This browser stays logged in (under a
 * new session id); every other session of the account ends on its next request.
 */
export async function changePassword(request: { currentPassword: string; password: string; passwordConfirmation: string }): Promise<void> {
  await http.put('/auth/password', {
    current_password: request.currentPassword,
    password: request.password,
    password_confirmation: request.passwordConfirmation,
  })
}

/** A 2FA secret to switch on, kept on the server until a code from the app confirms it. */
export type TwoFactorSetup = { secret: string; otpauthUrl: string }

export async function startTwoFactorSetup(): Promise<TwoFactorSetup> {
  const response = await http.post<Wrapped<{ secret: string; otpauth_url: string }>>('/auth/two-factor/setup')
  return { secret: response.data.data.secret, otpauthUrl: response.data.data.otpauth_url }
}

export async function enableTwoFactor(code: string): Promise<void> {
  await http.post('/auth/two-factor/enable', { code })
}

export async function disableTwoFactor(code: string): Promise<void> {
  await http.post('/auth/two-factor/disable', { code })
}
