import { describe, expect, it } from 'vitest'

import { fitScale } from '@/lib/fitScale'

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
