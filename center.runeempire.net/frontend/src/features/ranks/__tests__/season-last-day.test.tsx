/**
 * Regression test (review 2026-11-17, ranks R2). The bug it guards against: a seasonal rank with exactly 24 hours left shows the countdown
 * "Még 00:00:00" (aria "Még 0 óra 0 perc vásárolható"): SeasonInfo switches
 * to the countdown at left <= DAY_MS, but timeLeft puts the whole day into
 * `days`, which the countdown does not show.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { MyStats } from '@/features/home/stats'
import { RanksPage } from '@/features/ranks/RanksPage'
import { stubBrowserApis } from '@/test/fakeBackend'

const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api')>()
  return { ...original, http: { get: getMock } }
})

const account = { uuid: '00000000-0000-0000-0000-000000000009', username: 'shopper', display_name: 'Shopper', registered_at: '2026-01-01T10:00:00Z' }
const stats: MyStats = { runes: 50000, playtime: null, streak: null, rank: null, punishment: null, unavailable: [] }

/** RankResource sends whole seconds (toIso8601ZuluString). */
const SEASON_END = new Date('2026-12-26T23:00:00Z')
const DAY_MS = 86_400_000

const xmas = {
  group: 'karacsony',
  name: 'Karácsony',
  details: 'Szöveg.',
  gif_url: null,
  prefix_url: null,
  prices: [
    { days: 30, runes: 1500 },
    { days: 90, runes: 3900 },
  ],
  season_ends_at: '2026-12-26T23:00:00Z',
  color: null,
  servers: [],
}

beforeEach(() => {
  stubBrowserApis()
  getMock.mockImplementation(async (url: string) => {
    if (url === '/auth/me') return { data: { data: account } }
    if (url === '/ranks') return { data: { data: [xmas] } }
    if (url === '/me/stats') return { data: { data: stats } }
    throw new Error(`unexpected GET ${url}`)
  })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

/** The page opened at this moment: useNow starts from it, the ranks arrive well before its first 1 s tick. */
async function cardAt(now: Date) {
  vi.useFakeTimers({ shouldAdvanceTime: true, now })
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/rangok']}>
        <RanksPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return screen.findByRole('article')
}

describe('a seasonal rank with one day left', { timeout: 15_000 }, () => {
  it('exactly 24 hours left does not show "Még 00:00:00"', async () => {
    const card = await cardAt(new Date(SEASON_END.getTime() - DAY_MS))

    // Harm: 24 hours left, the countdown says none.
    expect(within(card).queryByRole('timer')?.getAttribute('aria-label')).not.toBe('Még 0 óra 0 perc vásárolható')
    expect(card.textContent).not.toContain('00:00:00')
  })

  it('under 24 hours left ticks the countdown', async () => {
    const timer = within(await cardAt(new Date(SEASON_END.getTime() - DAY_MS + 1000))).getByRole('timer')

    expect(timer.getAttribute('aria-label')).toBe('Még 23 óra 59 perc vásárolható')
    expect(timer.textContent).toContain('23:59:59')
  })
})
