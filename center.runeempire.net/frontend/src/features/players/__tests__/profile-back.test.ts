/**
 * The profile's back link from router state (features/players/links.ts profileBack; review 2026-11-23 K2 and its
 * follow-up): only same-site paths at every step ("//host" and "/\host" would leave the site: react-router reads both as
 * an absolute URL), and a chain kept at most 20 profiles deep.
 */
import { describe, expect, it } from 'vitest'

import { type ProfileBack, profileBack } from '@/features/players/links'

const TO_SEARCH = { to: '/jatekosok', label: 'Vissza a kereséshez' }

/** A chain of `length` profiles, the first one opened from the search. */
function chain(length: number): ProfileBack {
  let back: ProfileBack = { to: '/jatekosok?q=pa', label: 'Vissza a kereséshez' }
  for (let step = 1; step < length; step++) back = { to: `/jatekosok/P${step}`, label: `Vissza: P${step}`, back }
  return back
}

const depth = (back: ProfileBack | undefined): number => (back ? 1 + depth(back.back) : 0)

describe('profileBack', () => {
  it('keeps a same-site chain as it is', () => {
    expect(profileBack({ back: chain(3) })).toEqual(chain(3))
  })

  it.each(['//evil.example', '/\\evil.example', 'https://evil.example', 'jatekosok'])('refuses %s: back to the search', (to) => {
    expect(profileBack({ back: { to, label: 'Vissza' } })).toEqual(TO_SEARCH)
  })

  it('cuts a chain at the first step that leaves the site', () => {
    const back = profileBack({ back: { to: '/jatekosok/A', label: 'Vissza: A', back: { to: '/\\evil.example', label: 'x' } } })
    expect(back).toEqual({ to: '/jatekosok/A', label: 'Vissza: A' })
  })

  it('keeps at most 20 steps of a longer chain', () => {
    expect(depth(profileBack({ back: chain(25) }))).toBe(20)
    expect(depth(profileBack({ back: chain(20) }))).toBe(20)
  })

  it('anything else in the state is the search', () => {
    expect(profileBack(null)).toEqual(TO_SEARCH)
    expect(profileBack({ back: { to: 5, label: 'x' } })).toEqual(TO_SEARCH)
  })
})
