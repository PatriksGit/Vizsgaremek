/**
 * Regression test (review 2026-11-24, home HO-K5; advisor, 2026-11-24): the week chart's daily minutes were only in its
 * mouse tooltip. The chart is one labelled image (role="img", the week's total), so a screen reader and a keyboard
 * reached no single day. A screen-reader list beside it names each day up to today, like the chart draws them.
 *
 * Harness only: stubs for matchMedia and ResizeObserver (jsdom has neither).
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { PlaytimeCard } from '@/features/home/PlaytimeCard'
import { stubBrowserApis } from '@/test/fakeBackend'

beforeEach(() => {
  vi.stubEnv('TZ', 'Europe/Budapest')
  stubBrowserApis()
})

afterEach(() => {
  cleanup()
})

/** Wednesday 18 November 2026, 12:00 in Budapest. */
const WEDNESDAY = new Date('2026-11-18T11:00:00Z')

it('names each day up to today with its playtime, outside the chart image', () => {
  render(<PlaytimeCard week={[90, 0, 45, 0, 0, 0, 0]} asOf={WEDNESDAY} emptyText="Még nincs játékidőd ezen a héten" />)

  const days = screen.getByRole('list', { name: 'Napi játékidő' })
  expect(within(days).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Hétfő: 1 ó 30 p', 'Kedd: 0 p', 'Szerda: 45 p'])
  // A sibling of the image, not inside it: role="img" hides its content from a screen reader.
  expect(screen.getByRole('img', { name: /Játékidő ezen a héten/ }).contains(days)).toBe(false)
})

it('control: the chart image keeps its name with the week\'s total', () => {
  render(<PlaytimeCard week={[90, 0, 45, 0, 0, 0, 0]} asOf={WEDNESDAY} emptyText="Még nincs játékidőd ezen a héten" />)

  expect(screen.getByRole('img', { name: 'Játékidő ezen a héten, összesen 2 ó 15 p' })).toBeTruthy()
})
