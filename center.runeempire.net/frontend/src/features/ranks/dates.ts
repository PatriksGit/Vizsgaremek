import type { MyStats } from '@/features/home/stats'

import type { Rank } from './api'

const DAY_MS = 86_400_000

const budapestParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Budapest',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** The Budapest day of a moment, as the game and the overview count days: "2026.11.20.". */
export function budapestDay(date: Date) {
  return budapestParts.format(date).replaceAll('-', '.') + '.'
}

export function addDays(from: Date, days: number) {
  return new Date(from.getTime() + days * DAY_MS)
}

/** A countdown's parts; zero once the moment has passed. */
export function timeLeft(ms: number) {
  let left = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(left / 86_400)
  left -= days * 86_400
  const hours = Math.floor(left / 3600)
  left -= hours * 3600
  const minutes = Math.floor(left / 60)
  return { days, hours, minutes, seconds: left - minutes * 60 }
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

/** Whether a seasonal rank's buying time is over. */
export function seasonOver(rank: Rank, now: Date) {
  return rank.seasonEndsAt !== null && now >= new Date(rank.seasonEndsAt)
}
