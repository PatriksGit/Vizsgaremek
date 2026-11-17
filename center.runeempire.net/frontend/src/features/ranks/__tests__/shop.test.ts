/**
 * The shop's small calculations: a duration's real discount against the
 * shortest one, the level numeral, and the text colour on a rank's accent.
 */
import { describe, expect, it } from 'vitest'

import { accentVars, discountPercent, roman } from '@/features/ranks/shop'

/** A 30-day and a 90-day price. */
const prices = (thirty: number, ninety: number) => [
  { days: 30, runes: thirty },
  { days: 90, runes: ninety },
]

describe('discountPercent', () => {
  it('is the per-day saving against the shortest duration, rounded', () => {
    expect(discountPercent(prices(1000, 2600), 90)).toBe(13)
    expect(discountPercent(prices(1000, 2550), 90)).toBe(15)
  })

  it('is 0 for the shortest duration, a dearer per-day price, or an unknown one', () => {
    expect(discountPercent(prices(1000, 2600), 30)).toBe(0)
    expect(discountPercent(prices(1000, 3100), 90)).toBe(0)
    expect(discountPercent(prices(1000, 2600), 60)).toBe(0)
    expect(discountPercent(prices(0, 0), 90)).toBe(0)
  })
})

describe('roman', () => {
  it('writes the level as a Roman numeral', () => {
    expect([1, 2, 3, 4, 5, 9, 14].map(roman)).toEqual(['I', 'II', 'III', 'IV', 'V', 'IX', 'XIV'])
  })
})

describe('accentVars', () => {
  it('uses the rank colour, and the readable text colour on it', () => {
    expect(accentVars('#8800AF')).toEqual({ '--c': '#8800AF', '--on-c': '#ffffff' })
    expect(accentVars('#FF9C00')).toEqual({ '--c': '#FF9C00', '--on-c': '#14110d' })
  })

  it('falls back to the site gold without a usable colour', () => {
    expect(accentVars(null)).toEqual({ '--c': 'var(--primary)', '--on-c': 'var(--primary-foreground)' })
    expect(accentVars('red; background: url(x)')).toEqual({
      '--c': 'var(--primary)',
      '--on-c': 'var(--primary-foreground)',
    })
  })
})
