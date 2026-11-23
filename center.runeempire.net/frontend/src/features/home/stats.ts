import { useQuery } from '@tanstack/react-query'
import type { CSSProperties } from 'react'

import { useAccount } from '@/features/auth/queries'
import { http } from '@/lib/api'
import { budapestDay, serverToday } from '@/lib/budapest'

import type { Friend } from './FriendsCard'
import type { Punishment } from './PunishmentCard'
import type { Streak } from './StreakPanel'

/** The parts of the stats a plugin may leave out when it cannot be read. */
export type StatPart = 'runes' | 'playtime' | 'streak' | 'rank' | 'punishment'

/**
 * The text colour of a rank: the #RRGGBB set in game with
 * `/lp group <group> meta set color`, or none (the neutral text colour).
 */
export function rankColor(color: string | null): CSSProperties | undefined {
  return color ? { color } : undefined
}

/**
 * GET /api/me/stats: the logged-in player's numbers from the game plugins.
 * Times are UTC ISO 8601. A part whose plugin could not be read is null and
 * named in `unavailable`.
 */
export type MyStats = {
  runes: number | null
  playtime: {
    total_seconds: number
    /** Seconds played on each day of this week, Monday first. */
    week: number[]
  } | null
  streak: Streak | null
  rank: { group: string; name: string; expires_at: string | null; color: string | null } | null
  punishment: {
    kind: 'ban' | 'mute'
    until: string | null
    issued_at: string
    issued_by: string
    reason: string
  } | null
  unavailable: StatPart[]
}

/** The week's days, Monday first: short for the streak boxes and the chart, whole for screen readers and the tooltip. */
export const DAY_SHORT = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V']
export const DAY_NAMES = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap']

/** Today's place in the stats' week (Budapest days, like RuneActivity's), Monday first (0-6). */
export function serverTodayIndex(now = new Date()) {
  return (serverToday(now).getDay() + 6) % 7
}

/** What the overview writes where a number could not be loaded. */
export const NO_DATA = '—'

/** The stats with the server's moment of the answer (epoch ms): the day their week and today are for. */
export type StatsAnswer<T = MyStats> = T & { answeredAt: number }

/** The server's clock in a response's Date header, else the visitor's: the visitor's clock can be a day off. */
export function answeredAt(dateHeader: unknown) {
  const moment = Date.parse(String(dateHeader))
  return Number.isNaN(moment) ? Date.now() : moment
}

async function fetchMyStats(): Promise<StatsAnswer> {
  const response = await http.get<{ data: MyStats }>('/me/stats')
  return { ...response.data.data, answeredAt: answeredAt(response.headers?.date) }
}

/**
 * The overview's numbers, asked again every minute while the page is open.
 * Keyed by the account, so a new login never shows the previous player's.
 */
export function useMyStats() {
  const { data: account } = useAccount()

  return useQuery({
    queryKey: ['stats', account?.uuid],
    queryFn: fetchMyStats,
    enabled: Boolean(account),
    // One more try, then the cards show a dash instead of loading for long.
    retry: 1,
    staleTime: 60_000,
    refetchInterval: 60_000,
  })
}

async function fetchMyFriends(): Promise<Friend[]> {
  const response = await http.get<{ data: Friend[] }>('/me/friends')
  return response.data.data
}

/** The player's friends (GET /api/me/friends), online ones first; refreshed every minute like the stats. */
export function useMyFriends() {
  const { data: account } = useAccount()

  return useQuery({
    queryKey: ['friends', account?.uuid],
    queryFn: fetchMyFriends,
    enabled: Boolean(account),
    retry: 1,
    staleTime: 60_000,
    refetchInterval: 60_000,
  })
}

/** The punishment as the card shows it. */
export function toPunishment(punishment: MyStats['punishment']): Punishment | null {
  return punishment && {
    kind: punishment.kind,
    until: punishment.until,
    issuedAt: punishment.issued_at,
    issuedBy: punishment.issued_by,
    reason: punishment.reason,
  }
}

/** Hours with at most one decimal ("2,5"). */
export const hoursFormat = new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 1 })

/**
 * An API date written by `format` (lib/budapest), or the dash when it cannot be read: Intl throws a RangeError on an
 * invalid date (a year after 9999, which Carbon writes without its sign), which would crash the whole page.
 */
export function dateOrDash(iso: string, format: (date: Date) => string) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? NO_DATA : format(date)
}

/** "2026.11.20.", the Budapest day like the streak and the rank shop: fits a pill on one line. */
export function shortDate(iso: string) {
  return dateOrDash(iso, budapestDay)
}
