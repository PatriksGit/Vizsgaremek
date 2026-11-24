import type { Account } from '@/features/auth/api'
import { budapestLongDay, dateOrDash, DAY_MS } from '@/lib/budapest'

/**
 * "2026. október 16.", the Budapest day the account was made ("Csatlakozott"). An invalid date is the dash, not a
 * RangeError that would take the whole page to the error page (review 2026-11-23, home K4).
 */
export function joinedDay(iso: string) {
  return dateOrDash(iso, budapestLongDay)
}

/**
 * Whether the account was created within the last `days` days before `now`: a new player still finding their way.
 * `now` is the server's moment (the stats' answeredAt), so a device clock days off does not show the join hint to an old
 * player or hide it from a new one (review 2026-11-24 HO-K1); the visitor's clock only while it is not known yet.
 */
export function registeredWithin(account: Account | null | undefined, days: number, now: number | undefined) {
  if (!account?.registered_at) return false
  return (now ?? Date.now()) - Date.parse(account.registered_at) < days * DAY_MS
}
