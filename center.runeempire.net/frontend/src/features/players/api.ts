import { keepPreviousData, useQuery } from '@tanstack/react-query'

import type { Friend } from '@/features/home/FriendsCard'
import { answeredAt, type MyStats, type StatsAnswer } from '@/features/home/stats'
import { ApiError, http } from '@/lib/api'

/** A whole Minecraft name: 3-16 letters, digits or underscores (the backend's Account::NAME_PATTERN). */
export const PLAYER_NAME = /^[A-Za-z0-9_]{3,16}$/

/** What the search may start with: the characters a name can have, at most a whole name. */
const NAME_START = /^[A-Za-z0-9_]{1,16}$/

/** The search asks from this many letters on; one letter would list too many players. */
export const SEARCH_MIN_LENGTH = 2

/**
 * GET /api/players?q=: at most 30 players by name, and how many more match
 * (counted up to 1000), with the query they answer.
 */
type PlayerSearch = { query: string; players: { name: string }[]; more: number }

async function searchPlayers(query: string): Promise<PlayerSearch> {
  const response = await http.get<{ data: { name: string }[]; meta: { more: number } }>('/players', { params: { q: query } })
  return { query, players: response.data.data, more: response.data.meta.more }
}

/**
 * What an answer can show for the query in the box while that query's own
 * answer is on its way. Only an answer to the start of it helps (typing "pat"
 * after "pa"): its names that still match are a sure part of the new answer,
 * shown at once; an answer to anything else ("be" after "pa") shows nothing,
 * so earlier results never stand in for an unrelated search. `exact`: this
 * is the query's own answer, so `more` and "no hit" can be trusted.
 */
export function resultsFor(result: PlayerSearch | undefined, query: string) {
  const typed = query.toLowerCase()
  if (!result || !typed.startsWith(result.query.toLowerCase())) return null
  const exact = result.query.toLowerCase() === typed
  return {
    players: exact ? result.players : result.players.filter((player) => player.name.toLowerCase().startsWith(typed)),
    more: exact ? result.more : 0,
    exact,
  }
}

/** Whether the search box holds something the backend can be asked about. */
export function searchable(query: string) {
  return query.length >= SEARCH_MIN_LENGTH && NAME_START.test(query)
}

/**
 * The players whose name starts with the (already debounced) query. The
 * last answer is kept while the next one loads (placeholder data); the page
 * shows of it only what resultsFor lets through.
 */
export function usePlayerSearch(query: string) {
  return useQuery({
    queryKey: ['players', 'search', query.toLowerCase()],
    queryFn: () => searchPlayers(query),
    enabled: searchable(query),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    // A 429 or a down backend shows its message at once; the next keystroke asks again.
    retry: false,
  })
}

/** GET /api/players/{name}/stats: the same numbers as the overview's, plus the name and the registration day. */
type PlayerProfile = MyStats & { name: string; registered_at: string | null }

/** The backend has no such player (players.not_found). */
export const isMissingPlayer = (error: unknown) => error instanceof ApiError && error.status === 404

/** One more try, except for a player who does not exist or a refusal for asking too often (a retry would spend more). */
const retryUnlessMissing = (failures: number, error: Error) =>
  !isMissingPlayer(error) && !(error instanceof ApiError && error.status === 429) && failures < 1

/** Every minute, until the player turns out not to exist. */
const everyMinuteUnlessMissing = ({ state }: { state: { error: unknown } }) => (isMissingPlayer(state.error) ? false : 60_000)

/** Another player's numbers, asked again every minute like the overview's. */
export function usePlayerProfile(name: string) {
  return useQuery({
    queryKey: ['player', name.toLowerCase(), 'stats'],
    queryFn: async (): Promise<StatsAnswer<PlayerProfile>> => {
      const response = await http.get<{ data: PlayerProfile }>(`/players/${encodeURIComponent(name)}/stats`)
      return { ...response.data.data, answeredAt: answeredAt(response.headers?.date) }
    },
    enabled: PLAYER_NAME.test(name),
    retry: retryUnlessMissing,
    staleTime: 60_000,
    refetchInterval: everyMinuteUnlessMissing,
  })
}

/** Another player's friends (GET /api/players/{name}/friends), online ones first. */
export function usePlayerFriends(name: string) {
  return useQuery({
    queryKey: ['player', name.toLowerCase(), 'friends'],
    queryFn: async () => (await http.get<{ data: Friend[] }>(`/players/${encodeURIComponent(name)}/friends`)).data.data,
    enabled: PLAYER_NAME.test(name),
    retry: retryUnlessMissing,
    staleTime: 60_000,
    refetchInterval: everyMinuteUnlessMissing,
  })
}
