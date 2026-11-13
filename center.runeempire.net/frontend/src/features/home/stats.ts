import { useQuery } from '@tanstack/react-query'

import { useAccount } from '@/features/auth/queries'
import { http } from '@/lib/api'

import type { Friend } from './FriendsCard'
import type { Punishment } from './PunishmentCard'
import type { Streak } from './StreakPanel'

/** The parts of the stats a plugin may leave out when it cannot be read. */
export type StatPart = 'runes' | 'playtime' | 'streak' | 'rank' | 'punishment'

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
  rank: { group: string; name: string; expires_at: string | null } | null
  punishment: {
    kind: 'ban' | 'mute'
    until: string | null
    issued_at: string
    issued_by: string
    reason: string
  } | null
  unavailable: StatPart[]
}

/** What the overview writes where a number could not be loaded. */
export const NO_DATA = '—'

async function fetchMyStats(): Promise<MyStats> {
  const response = await http.get<{ data: MyStats }>('/me/stats')
  return response.data.data
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

export const runeCountFormat = new Intl.NumberFormat('hu-HU')

/** Whole hours from ten up, one decimal below ("2,5"). */
export const hoursFormat = new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 1 })

/** "2026.11.20.": fits a pill on one line. */
export function shortDate(iso: string) {
  const date = new Date(iso)
  const twoDigits = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}.${twoDigits(date.getMonth() + 1)}.${twoDigits(date.getDate())}.`
}
