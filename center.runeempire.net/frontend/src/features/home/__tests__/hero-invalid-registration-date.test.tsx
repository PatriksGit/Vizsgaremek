/**
 * Regression test (review 2026-11-23, home K4). HeroCard wrote "Csatlakozott" with Intl's format(new Date(registeredAt)),
 * which throws a RangeError on an invalid date (a year after 9999, which Carbon writes without its sign): the whole page
 * fell to the error page, while the rule is that a date that cannot be read shows the dash in its own place.
 *
 * Fakes only the edge: the 3D viewer module (WebGL; jsdom has none).
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { HeroCard } from '@/features/home/HeroCard'
import { OWN_WORDING } from '@/features/home/wording'
import { stubBrowserApis } from '@/test/fakeBackend'

vi.mock('@/features/home/SkinViewer3D', () => ({ default: () => null }))

beforeEach(stubBrowserApis)
afterEach(cleanup)

/** The "Csatlakozott" lines (the phone line and the md pill) as they read. */
function joinedShown(registeredAt: string) {
  render(
    <HeroCard
      label="Áttekintés"
      greeting="Szia!"
      name="Anna"
      registeredAt={registeredAt}
      streak={undefined}
      streakText={OWN_WORDING.streak}
    />,
  )
  return screen.getAllByText(/^Csatlakozott:/).map((line) => line.textContent?.replace(/\s/g, ' '))
}

it('repro: an invalid registration date shows the dash, not a crashed page', () => {
  expect(joinedShown('10000-01-01T00:00:00+00:00')).toEqual(['Csatlakozott: —', 'Csatlakozott: —'])
})

it('control: a valid registration date is the Budapest day', () => {
  // 23:30 UTC on 15 October is already 16 October in Budapest.
  expect(joinedShown('2026-10-15T23:30:00Z')).toEqual(['Csatlakozott: 2026. október 16.', 'Csatlakozott: 2026. október 16.'])
})
