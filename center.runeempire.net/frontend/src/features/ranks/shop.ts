import type { CSSProperties } from 'react'

import type { RankPrice } from './api'

/**
 * A duration's real per-day saving against the shortest duration, in whole
 * percent; 0 when there is none. Computed from the prices, never typed in
 * (owner, 2026-11-17: "adjustable later"), so changing the 90-day price in
 * the management section moves the badge with it and it can never lie.
 */
export function discountPercent(prices: RankPrice[], days: number): number {
  const shortest = [...prices].sort((a, b) => a.days - b.days)[0]
  const chosen = prices.find((option) => option.days === days)
  if (!shortest || !chosen || shortest.runes <= 0 || chosen.days === shortest.days) return 0

  const saving = 1 - chosen.runes / chosen.days / (shortest.runes / shortest.days)
  return Math.max(0, Math.round(saving * 100))
}

const NUMERALS: [number, string][] = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
]

/** A rank's level on its card as a Roman numeral (I, II, … in shop order). */
export function roman(level: number): string {
  let rest = level
  let out = ''
  for (const [value, numeral] of NUMERALS) {
    while (rest >= value) {
      out += numeral
      rest -= value
    }
  }
  return out
}

const HEX = /^#[0-9a-f]{6}$/i
const DARK_TEXT = '#14110d'

/** WCAG relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((at) => {
    const channel = parseInt(hex.slice(at, at + 2), 16) / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * A card's accent (owner, 2026-11-17): the rank's LuckPerms colour as --c, and
 * --on-c, whichever of white or near-black reads better on it. Without a
 * usable colour, the site gold. Only a #rrggbb value gets into the style.
 */
export function accentVars(color: string | null): CSSProperties {
  if (!color || !HEX.test(color))
    return {
      '--c': 'var(--primary)',
      '--on-c': 'var(--primary-foreground)',
    } as CSSProperties

  const lum = luminance(color)
  const onWhite = 1.05 / (lum + 0.05)
  const onDark = (lum + 0.05) / (luminance(DARK_TEXT) + 0.05)
  return {
    '--c': color,
    '--on-c': onWhite >= onDark ? '#ffffff' : DARK_TEXT,
  } as CSSProperties
}
