import type { Account } from '@/features/auth/api'

const DAY_MS = 86_400_000

/** "2026. október 16." */
export const registrationDate = new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })

/** Whether the account was created within the last `days` days: a new player still finding their way. */
export function registeredWithin(account: Account | null | undefined, days: number) {
  if (!account?.registered_at) return false
  return Date.now() - Date.parse(account.registered_at) < days * DAY_MS
}
