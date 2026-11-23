import type { Account } from '@/features/auth/api'
import { budapestLongDay, DAY_MS } from '@/lib/budapest'

import { dateOrDash } from './stats'

/**
 * "2026. október 16.", the Budapest day the account was made ("Csatlakozott"). An invalid date is the dash, not a
 * RangeError that would take the whole page to the error page (review 2026-11-23, home K4).
 */
export function joinedDay(iso: string) {
  return dateOrDash(iso, budapestLongDay)
}

/** Whether the account was created within the last `days` days: a new player still finding their way. */
export function registeredWithin(account: Account | null | undefined, days: number) {
  if (!account?.registered_at) return false
  return Date.now() - Date.parse(account.registered_at) < days * DAY_MS
}
