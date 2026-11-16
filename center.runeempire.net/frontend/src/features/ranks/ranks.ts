/** How long a bought rank lasts: the shop sells 30 or 90 days. */
export type Duration = 30 | 90

export const DURATIONS: Duration[] = [30, 90]

/** A rank the shop sells. */
export type Rank = {
  /** The LuckPerms group the rank gives, as /api/me/stats names it in rank.group. */
  id: string
  name: string
  description: string
  /** An animated banner under public/, shown 3:1. */
  gif?: string
  /** What the rank gives, one tab per game server. */
  perks: { server: string; lines: string[] }[]
  /** Price in runes for each duration. */
  prices: Record<Duration, number>
  /** A seasonal rank can be bought until this time (ISO 8601), then the card says so. */
  seasonEndsAt?: string
}

const DESCRIPTION =
  '[Rövid leírás – mit ad ez a rang. Hosszabb szöveg esetén három sor után levágjuk, a teljes leírás és a szerverenkénti előnyök a „Mit kapsz?” ablakban olvashatók.]'

/** Placeholder perks until the owner fills in the real ones. */
function placeholderPerks(): Rank['perks'] {
  return ['Szerver 1', 'Szerver 2', 'Szerver 3'].map((server) => ({
    server: `[${server}]`,
    lines: [1, 2, 3, 4].map((n) => `[${server} – előny ${n}]`),
  }))
}

/**
 * The ranks on sale. Placeholders from the owner's design (Claude Design, "Asztali – Rangok")
 * until the real names, prices and perks are decided; buying is not wired yet.
 */
export const RANKS: Rank[] = [
  {
    id: 'karacsony',
    name: '[KARÁCSONYI RANG]',
    description: DESCRIPTION,
    perks: placeholderPerks(),
    prices: { 30: 1500, 90: 3900 },
    seasonEndsAt: '2026-12-27T00:00:00+01:00',
  },
  { id: 'dragon', name: 'Dragon', description: DESCRIPTION, gif: '/ranks/dragon.gif', perks: placeholderPerks(), prices: { 30: 2000, 90: 5200 } },
  ...[1, 2, 3, 4].map(
    (n): Rank => ({
      id: `rang${n}`,
      name: '[RANG NEVE]',
      description: DESCRIPTION,
      perks: placeholderPerks(),
      prices: { 30: 1000 * n, 90: 2600 * n },
    }),
  ),
]
