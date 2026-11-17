import { useQuery } from '@tanstack/react-query'

import { http } from '@/lib/api'

/** One way to buy a rank: how many days, for how many runes. */
export type RankPrice = { days: number; runes: number }

/** A rank the shop sells (GET /api/ranks, from the database; the management section will edit them). */
export type Rank = {
  /** The LuckPerms group it gives, as /api/me/stats names it in rank.group. */
  group: string
  name: string
  /** "Mit kapsz?" as Markdown. */
  details: string
  gifUrl: string | null
  /** The in-game prefix image (the ItemsAdder glyph), or null. */
  prefixUrl: string | null
  /** The durations it sells for, shortest first. */
  prices: RankPrice[]
  /** A seasonal rank sells until this time (ISO 8601); null for the rest. */
  seasonEndsAt: string | null
  /** The in-game colour (#RRGGBB, set with `/lp group <group> meta set color`), or null. */
  color: string | null
}

type RankResponse = {
  group: string
  name: string
  details: string
  gif_url: string | null
  prefix_url: string | null
  prices: RankPrice[]
  season_ends_at: string | null
  color: string | null
}

async function fetchRanks(): Promise<Rank[]> {
  const response = await http.get<{ data: RankResponse[] }>('/ranks')
  return response.data.data.map((rank) => ({
    group: rank.group,
    name: rank.name,
    details: rank.details,
    gifUrl: rank.gif_url,
    prefixUrl: rank.prefix_url,
    prices: [...rank.prices].sort((a, b) => a.days - b.days),
    seasonEndsAt: rank.season_ends_at,
    color: rank.color,
  }))
}

/** The ranks on sale, in shop order. */
export function useRanks() {
  return useQuery({ queryKey: ['ranks'], queryFn: fetchRanks, staleTime: 60_000 })
}
