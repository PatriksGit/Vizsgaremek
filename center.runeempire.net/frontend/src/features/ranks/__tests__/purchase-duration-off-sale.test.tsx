/**
 * Regression test (review 2026-11-23, ranks-players RP1): the purchase popup is open on a duration (Dragon, 90 nap); staff
 * takes that duration off sale in the management section; the ['ranks'] refetch
 * reaches the open popup, which then asks "Biztosan?" about the rank for 0 rúna.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
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
const NOW = new Date('2026-11-16T12:00:00Z')
const stats: MyStats = { runes: 50000, playtime: null, streak: null, rank: null, punishment: null, unavailable: [] }

const dragon = (prices: { days: number; runes: number }[]) => ({
  group: 'dragon',
  name: 'Dragon',
  details: 'Szöveg.',
  gif_url: null,
  prefix_url: null,
  prices,
  season_ends_at: null,
  color: null,
})

let ranks = [dragon([{ days: 30, runes: 2000 }, { days: 90, runes: 5000 }])]

beforeEach(() => {
  stubBrowserApis()
  vi.useFakeTimers({ shouldAdvanceTime: true, now: NOW })
  ranks = [dragon([{ days: 30, runes: 2000 }, { days: 90, runes: 5000 }])]
  getMock.mockImplementation(async (url: string) => {
    if (url === '/auth/me') return { data: { data: account } }
    if (url === '/ranks') return { data: { data: ranks } }
    if (url === '/me/stats') return { data: { data: stats } }
    throw new Error(`unexpected GET ${url}`)
  })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

async function openNinetyDayPurchase() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/rangok']}>
        <RanksPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await screen.findByRole('heading', { name: 'Dragon' })
  fireEvent.click(screen.getByRole('radio', { name: /90 nap/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Megveszem: Dragon, 90 nap' }))
  return screen.findByRole('alertdialog')
}

/** The player comes back to the tab a minute later: TanStack refetches the stale ['ranks'] query. */
async function refocusAfterAMinute() {
  await act(() => vi.advanceTimersByTimeAsync(61_000))
  await act(async () => {
    window.dispatchEvent(new Event('visibilitychange'))
  })
  await act(() => vi.advanceTimersByTimeAsync(50))
}

const prices = () => screen.queryAllByText(/\d rúna$/, { selector: 'span' }).map((element) => element.textContent?.replace(/\s/g, ' '))

describe('RP1: the open purchase popup after its duration is taken off sale', { timeout: 15_000 }, () => {
  it('repro: the popup closes instead of asking about buying the rank for 0 rúna', async () => {
    const popup = await openNinetyDayPurchase()
    expect(within(popup).getByText(/\d rúna$/).textContent?.replace(/\s/g, ' ')).toBe('5000 rúna')

    // Staff sells Dragon for 30 days only from now on.
    ranks = [dragon([{ days: 30, runes: 2000 }])]
    await refocusAfterAMinute()

    expect(getMock.mock.calls.filter(([url]) => url === '/ranks').length).toBe(2) // it did refetch
    // Harm: the still-open "Biztosan szeretnéd megvásárolni a rangot?" popup said "Dragon · 90 nap" for "0 rúna".
    expect(screen.queryByText(/^0 rúna$/)).toBeNull()
    // Like a rank taken off sale, the popup closes (jsdom runs no exit animation, so it is gone at once).
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('control: a duration that stays on sale shows its new price', async () => {
    const popup = await openNinetyDayPurchase()
    expect(within(popup).getByText(/\d rúna$/).textContent?.replace(/\s/g, ' ')).toBe('5000 rúna')

    ranks = [dragon([{ days: 30, runes: 2000 }, { days: 90, runes: 5500 }])]
    await refocusAfterAMinute()

    expect(prices()).toContain('5500 rúna')
    expect(within(screen.getByRole('alertdialog')).queryByText(/^0 rúna$/)).toBeNull()
  })
})
