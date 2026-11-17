import { describe, expect, it } from 'vitest'

import { addDays, budapestDay, ownedUntil, seasonEndText, seasonOver, timeLeft } from '@/features/ranks/dates'
import type { Rank } from '@/features/ranks/api'
import type { MyStats } from '@/features/home/stats'

const dragon: Rank = { group: 'dragon', name: 'Dragon', details: '', gifUrl: null, prices: [{ days: 30, runes: 1000 }], seasonEndsAt: null }
const NOW = new Date('2026-11-16T12:00:00Z')

function stats(rank: MyStats['rank']): MyStats {
  return { runes: 0, playtime: null, streak: null, rank, punishment: null, unavailable: [] }
}

describe('rank shop dates', () => {
  it('names the Budapest day, even late in the evening in UTC', () => {
    expect(budapestDay(new Date('2026-11-20T10:00:00Z'))).toBe('2026.11.20.')
    expect(budapestDay(new Date('2026-11-20T23:30:00Z'))).toBe('2026.11.21.')
  })

  it('adds 30 and 90 days', () => {
    expect(budapestDay(addDays(NOW, 30))).toBe('2026.12.16.')
    expect(budapestDay(addDays(NOW, 90))).toBe('2027.02.14.')
  })

  it('splits the time left into days, hours, minutes and seconds, never below zero', () => {
    expect(timeLeft(90_061_000)).toEqual({ days: 1, hours: 1, minutes: 1, seconds: 1 })
    expect(timeLeft(-5000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  })

  it('a rank is owned only when the stats name it with a future expiry', () => {
    const future = '2026-11-20T12:00:00Z'
    expect(ownedUntil(dragon, stats({ group: 'dragon', name: 'Dragon', expires_at: future, color: null }), NOW)).toEqual(new Date(future))
    expect(ownedUntil(dragon, stats({ group: 'mage', name: 'Mage', expires_at: future, color: null }), NOW)).toBeNull()
    // A permanent rank (no expiry) has nothing to extend or show.
    expect(ownedUntil(dragon, stats({ group: 'dragon', name: 'Dragon', expires_at: null, color: null }), NOW)).toBeNull()
    expect(ownedUntil(dragon, stats({ group: 'dragon', name: 'Dragon', expires_at: '2026-11-01T00:00:00Z', color: null }), NOW)).toBeNull()
    expect(ownedUntil(dragon, stats(null), NOW)).toBeNull()
    expect(ownedUntil(dragon, undefined, NOW)).toBeNull()
  })

  it('names the last day a seasonal rank sells, or the exact time when it does not end at midnight', () => {
    // 2026-12-27 00:00 Budapest: the 26th is the last full day.
    expect(seasonEndText('2026-12-26T23:00:00Z')).toBe('2026.12.26-ig')
    // 18:00 Budapest.
    expect(seasonEndText('2026-12-27T17:00:00Z')).toBe('2026.12.27. 18:00-ig')
  })

  it('only a seasonal rank past its end is over', () => {
    expect(seasonOver(dragon, NOW)).toBe(false)
    const xmas = { ...dragon, seasonEndsAt: '2026-12-27T00:00:00+01:00' }
    expect(seasonOver(xmas, NOW)).toBe(false)
    expect(seasonOver(xmas, new Date('2026-12-26T23:00:00Z'))).toBe(true)
  })
})
