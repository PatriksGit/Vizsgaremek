/**
 * Which pages are built. Switch one on once its page exists: the menu, the
 * hero button and the stat tiles that lead there follow this list.
 */
export const features = {
  ranks: false,
  runes: false,
  /** Buying a shorter ban. */
  banReduction: false,
  /** Sending runes to another player. */
  transfer: false,
  players: false,
  leaderboard: false,
  log: false,
} satisfies Record<string, boolean>

export type Feature = keyof typeof features

/**
 * Unbuilt pages show in the menu with a "Hamarosan" badge only while
 * developing, to see the finished layout; production leaves them out.
 */
export const showComingSoon = import.meta.env.DEV
