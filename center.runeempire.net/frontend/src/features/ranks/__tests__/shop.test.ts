/**
 * The shop's small calculations: a duration's real discount against the
 * shortest one, fitting a line to its box, and the text colour on a rank's accent.
 */
import { describe, expect, it } from 'vitest'

import { fitScale } from '@/lib/fitScale'
import { accentVars, discountPercent } from '@/features/ranks/shop'

/** The in-game look stays on one line (owner, 2026-11-17): it shrinks to fit instead of wrapping. */
describe('fitScale', () => {
  it('shrinks a line wider than its box to the box, and never grows one', () => {
    expect(fitScale(300, 240)).toBe(0.8)
    expect(fitScale(200, 240)).toBe(1)
    expect(fitScale(240, 240)).toBe(1)
  })

  it('leaves a line that has not been measured yet alone', () => {
    expect(fitScale(0, 240)).toBe(1)
    expect(fitScale(300, 0)).toBe(1)
  })
})

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
