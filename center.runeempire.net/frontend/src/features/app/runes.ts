/**
 * The player's rune balance; undefined while it is unknown, which the pill
 * and the overview's tile show as a skeleton.
 *
 * TODO: read it from the stats API once the backend serves the balance.
 */
export function useRuneBalance(): number | undefined {
  return undefined
}

export const runeCountFormat = new Intl.NumberFormat('hu-HU')
