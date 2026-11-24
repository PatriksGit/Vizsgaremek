import { useQuery } from '@tanstack/react-query'

import { useAccount } from '@/features/auth/queries'
import { http, serverMoment } from '@/lib/api'

/** The parts of the stats a plugin may leave out when it cannot be read. */
export type StatPart = 'runes' | 'playtime' | 'streak' | 'rank' | 'punishment'

/** One day of this week's login streak, as GET /api/me/stats sends it. */
export type StreakDayStatus = 'done' | 'missed' | 'pending' | 'future' | 'before'

export type Streak = {
  /** Days in a row, today included once the player logged in. */
  current: number
  best: number
  /** This week, Monday first: seven days. */
  week: StreakDayStatus[]
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

/** The stats with the server's moment of the answer (epoch ms): the day their week and today are for. */
export type StatsAnswer<T = MyStats> = T & { answeredAt: number }

/** A friend from RuneFriends, as GET /api/me/friends sends it. */
export type Friend = {
  name: string
  online: boolean
  /** They have a website account, so a profile to open; RuneFriends may know a friend without one. */
  has_profile: boolean
  /** Their LuckPerms rank; null when LuckPerms could not be read. */
  rank: { name: string; color: string | null } | null
}

/** GET /api/discord-widget: Discord's public widget, cut down by the backend. */
export type DiscordWidget = {
  presence_count: number
  instant_invite: string | null
  members: DiscordMember[]
}

export type DiscordMember = {
  username: string
  avatar_url: string | null
  status: string
}

async function fetchMyStats(): Promise<StatsAnswer> {
  const response = await http.get<{ data: MyStats }>('/me/stats')
  return { ...response.data.data, answeredAt: serverMoment(response.headers?.date) }
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

async function fetchDiscordWidget(): Promise<DiscordWidget> {
  const response = await http.get<{ data: DiscordWidget }>('/discord-widget')
  return response.data.data
}

/**
 * Who is on the Discord, refreshed every minute: as often as the backend asks
 * Discord. No retries, since the backend remembers a failure for that minute.
 */
export function useDiscordWidget() {
  return useQuery({
    queryKey: ['discord-widget'],
    queryFn: fetchDiscordWidget,
    refetchInterval: 60_000,
    // Without it every return to the tab would ask again.
    staleTime: 60_000,
    retry: false,
  })
}
