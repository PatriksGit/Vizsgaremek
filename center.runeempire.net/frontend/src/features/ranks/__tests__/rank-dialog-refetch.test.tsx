/**
 * Regression test (review 2026-11-17, ranks R1). The bug it guards against: an open rank dialog keeps the rank object it was opened with. When
 * GET /api/ranks is refetched (window focus after the 60 s staleTime) and staff
 * changed the price or removed the rank, the card behind shows the new data
 * while the open popup still shows the old price / a rank no longer on sale.
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

const rank = (group: string, name: string, thirty: number) => ({
  group,
  name,
  details: 'Szöveg.',
  gif_url: null,
  prefix_url: null,
  prices: [
    { days: 30, runes: thirty },
    { days: 90, runes: thirty * 2 },
  ],
  season_ends_at: null,
  color: null
})

let ranks = [rank('dragon', 'Dragon', 2000), rank('mage', 'Mage', 1000)]

beforeEach(() => {
  stubBrowserApis()
  vi.useFakeTimers({ shouldAdvanceTime: true, now: NOW })
  ranks = [rank('dragon', 'Dragon', 2000), rank('mage', 'Mage', 1000)]
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

function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/rangok']}>
        <RanksPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const text = (element: Element | null | undefined) => element?.textContent?.replace(/\s/g, ' ')
const card = (name: string) =>
  screen.getAllByRole('article', { hidden: true }).find((article) => within(article).queryByRole('heading', { name, hidden: true }))

/** The player comes back to the tab a minute later: TanStack refetches the stale ['ranks'] query. */
async function refocusAfterAMinute() {
  await act(() => vi.advanceTimersByTimeAsync(61_000))
  await act(async () => {
    window.dispatchEvent(new Event('visibilitychange'))
  })
  await act(() => vi.advanceTimersByTimeAsync(50))
}

async function openDragonPurchase() {
  renderPage()
  await screen.findByRole('heading', { name: 'Dragon' })
  fireEvent.click(screen.getByRole('button', { name: 'Megveszem: Dragon, 30 nap' }))
  return screen.findByRole('alertdialog')
}

const popupPrice = (popup: HTMLElement) => text(within(popup).getByText(/\d rúna$/))
const cardPrice = (name: string) => text(within(card(name)!).getByText(/\d rúna$/))

describe('an open rank dialog after GET /api/ranks is refetched', { timeout: 15_000 }, () => {
  it('a refetched price reaches the open purchase popup', async () => {
    const popup = await openDragonPurchase()
    expect(popupPrice(popup)).toBe('2000 rúna')

    // Staff raises the price in the management section.
    ranks = [rank('dragon', 'Dragon', 2500), rank('mage', 'Mage', 1000)]
    await refocusAfterAMinute()

    expect(cardPrice('Dragon')).toBe('2500 rúna') // the shop now sells it for 2500
    // Harm: the open "Biztosan?" popup still asks about 2000 runes.
    expect(popupPrice(screen.getByRole('alertdialog'))).toBe(cardPrice('Dragon'))
  })

  it('a rank taken off sale is no longer offered in its open dialog', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Mage' })
    fireEvent.click(screen.getByRole('button', { name: 'Tudj meg többet a rangról: Mage' }))
    expect(await screen.findByRole('dialog')).toBeTruthy()

    // Staff takes Mage off sale.
    ranks = [rank('dragon', 'Dragon', 2000)]
    await refocusAfterAMinute()

    expect(card('Mage')).toBeUndefined() // the card is gone
    // Harm: the details dialog still offers to buy the removed rank.
    expect(screen.queryByRole('button', { name: 'Megveszem: Mage, 30 nap' })).toBeNull()
  })

  it('an unchanged refetch keeps the popup as it was', async () => {
    const popup = await openDragonPurchase()
    expect(popupPrice(popup)).toBe('2000 rúna')

    // The refetch answers the same.
    await refocusAfterAMinute()

    expect(getMock.mock.calls.filter(([url]) => url === '/ranks').length).toBe(2) // it did refetch
    expect(cardPrice('Dragon')).toBe('2000 rúna')
    expect(popupPrice(screen.getByRole('alertdialog'))).toBe(cardPrice('Dragon'))
  })
})
