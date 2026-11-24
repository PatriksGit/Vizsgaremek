import type { CSSProperties } from 'react'

/**
 * The text colour of a rank: the #RRGGBB set in game with
 * `/lp group <group> meta set color`, or none (the neutral text colour).
 */
export function rankColor(color: string | null): CSSProperties | undefined {
  return color ? { color } : undefined
}
