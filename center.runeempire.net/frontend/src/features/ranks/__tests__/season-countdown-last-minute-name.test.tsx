/**
 * Review 2026-11-24 RK-3: in a seasonal rank's last minute the countdown shows "Még 00:00:45", but its screen-reader name dropped the
 * seconds and said "Még 0 óra 0 perc vásárolható": the same "none left" the R2 fix removed at exactly 24 hours.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { MyStats } from '@/features/home/api'
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
  color: null
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

describe('the countdown\'s name in the last minute', { timeout: 15_000 }, () => {
  it('45 seconds left is read out in seconds, not as 0 hours 0 minutes', async () => {
    const card = await cardAt(new Date(SEASON_END.getTime() - 45_000))

    expect(card.textContent).toContain('00:00:45') // the visible countdown
    // Harm: the screen reader hears that no time is left while the rank is still on sale.
    expect(within(card).getByRole('timer').getAttribute('aria-label')).toBe('Még 45 másodperc vásárolható')
  })

  it('control: two hours left reads its hours and minutes', async () => {
    const card = await cardAt(new Date(SEASON_END.getTime() - 2 * 3_600_000))

    expect(within(card).getByRole('timer').getAttribute('aria-label')).toBe('Még 2 óra 0 perc vásárolható')
  })
})
