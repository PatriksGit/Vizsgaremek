import type { MyStats } from '@/features/home/api'
import { budapestClock, budapestDay, dateOrDash, DAY_MS } from '@/lib/budapest'

import type { Rank } from './api'

export function addDays(from: Date, days: number) {
  return new Date(from.getTime() + days * DAY_MS)
}

/** A countdown's parts (whole hours, so the last day reads 23:59:59 down); zero once the moment has passed. */
export function timeLeft(ms: number) {
  let left = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(left / 3600)
  left -= hours * 3600
  const minutes = Math.floor(left / 60)
  return { hours, minutes, seconds: left - minutes * 60 }
}

/**
 * Until when the player has this rank, or null. The stats name only the
 * player's highest rank, so a bought rank under a higher one does not show; a
 * permanent rank (no expiry) has nothing to extend.
 */
export function ownedUntil(rank: Rank, stats: MyStats | undefined, now: Date): Date | null {
  const current = stats?.rank
  if (!current || current.group !== rank.group || current.expires_at === null) return null
  const until = new Date(current.expires_at)
  return until > now ? until : null
}

/**
 * Until when a seasonal rank sells, as a fixed date: "2026.12.26-ig" when it
 * ends at Budapest midnight (the day before is the last full day), otherwise
 * "2026.12.27. 18:00-ig". A date that cannot be read is the dash, never a RangeError (review 2026-11-23, like K4).
 */
export function seasonEndText(endsAt: string) {
  return dateOrDash(endsAt, (end) => {
    const clock = budapestClock(end)
    if (clock === '00:00') return `${budapestDay(new Date(end.getTime() - 1000)).slice(0, -1)}-ig`
    return `${budapestDay(end)} ${clock}-ig`
  })
}

/** Whether a seasonal rank's buying time is over. */
export function seasonOver(rank: Rank, now: Date) {
  return rank.seasonEndsAt !== null && now >= new Date(rank.seasonEndsAt)
}
