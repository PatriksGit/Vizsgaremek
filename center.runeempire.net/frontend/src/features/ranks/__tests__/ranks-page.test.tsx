/**
 * The rank shop (owner's design, Claude Design "Asztali – Rangok"): the ranks
 * come from GET /api/ranks (the database), "Mit kapsz?" shows each rank's
 * Markdown text, and the purchase dialog's final button stays off until buying
 * is wired.
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

/** 2026-11-16 13:00 in Budapest; the seasonal rank sells until 2026-12-27 00:00 Budapest. */
const NOW = new Date('2026-11-16T12:00:00Z')
const SEASON_END = new Date('2026-12-26T23:00:00Z')

const DETAILS = 'Egy erős rang.\n\n## Globális\n- Repülés\n- Napi rúna\n\n## Kingdoms\n- Extractor'
const prices = (thirty: number) => [
  { days: 30, runes: thirty },
  { days: 90, runes: Math.round(thirty * 2.6) },
]

/** As GET /api/ranks answers, in shop order. */
const RANKS = [
  { group: 'karacsony', name: 'Karácsony', details: DETAILS, gif_url: null, prices: prices(1500), season_ends_at: SEASON_END.toISOString(), color: null },
  { group: 'dragon', name: 'Dragon', details: DETAILS, gif_url: '/ranks/dragon.gif', prices: prices(2000), season_ends_at: null, color: '#E5675A' },
  { group: 'mage', name: 'Mage', details: DETAILS, gif_url: null, prices: prices(1000), season_ends_at: null, color: null },
]

function statsWith(rank: MyStats['rank'], runes = 5000): MyStats {
  return { runes, playtime: null, streak: null, rank, punishment: null, unavailable: [] }
}

function backend(stats: MyStats | 'fails', ranks: typeof RANKS | 'fails' = RANKS) {
  getMock.mockImplementation(async (url: string) => {
    if (url === '/auth/me') return { data: { data: account } }
    if (url === '/ranks') {
      if (ranks === 'fails') throw new Error('ranks down')
      return { data: { data: ranks } }
    }
    if (url === '/me/stats') {
      if (stats === 'fails') throw new Error('stats down')
      return { data: { data: stats } }
    }
    throw new Error(`unexpected GET ${url}`)
  })
}

function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/rangok']}>
        <RanksPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const card = (name: string) => screen.getAllByRole('article').find((article) => within(article).queryByRole('heading', { name }))!

beforeEach(() => {
  stubBrowserApis()
  vi.useFakeTimers({ shouldAdvanceTime: true, now: NOW })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('the rank cards', { timeout: 15_000 }, () => {
  it('lists the ranks from the database; the one the player has shows until when, with an extend button', async () => {
    backend(statsWith({ group: 'dragon', name: 'Dragon', expires_at: '2026-11-20T12:00:00Z', color: null }))
    renderPage()

    expect(await screen.findByText('Aktív eddig: 2026.11.20.')).toBeTruthy()
    expect(screen.getAllByRole('article')).toHaveLength(3)
    // One button per duration, its price on it (owner, 2026-11-17).
    expect(within(card('Dragon')).getByRole('button', { name: /^Meghosszabbítás: \+30 nap\s*2000 rúna$/ })).toBeTruthy()
    expect(within(card('Dragon')).getByRole('button', { name: /^Meghosszabbítás: \+90 nap\s*5200 rúna$/ })).toBeTruthy()
    expect(within(card('Mage')).getByRole('button', { name: /^Megvásárlás: 30 nap\s*1000 rúna$/ })).toBeTruthy()
    expect(within(card('Mage')).getByRole('button', { name: /^Megvásárlás: 90 nap\s*2600 rúna$/ })).toBeTruthy()
    expect(within(card('Dragon')).getByRole('img', { name: 'Dragon rang animációja' })).toBeTruthy()
  })

  /**
   * A fixed date, not a ticking timer, for a 13-17 audience (owner, 2026-11-17;
   * the Dutch ACM fined Epic for Fortnite's shop timers): the countdown ticks only
   * in the last 24 hours.
   */
  it('a seasonal rank shows its last day, ticks only in its last 24 hours, then can no longer be bought', async () => {
    backend(statsWith(null))
    renderPage()
    const xmas = await screen.findByRole('heading', { name: 'Karácsony' }).then(() => card('Karácsony'))

    expect(within(xmas).getByText('Szezonális')).toBeTruthy()
    expect(within(xmas).getByText('Még vásárolható: 2026.12.26-ig')).toBeTruthy()
    expect(within(xmas).queryByRole('timer')).toBeNull()

    act(() => vi.setSystemTime(new Date(SEASON_END.getTime() - 2 * 3600_000)))
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(within(xmas).getByRole('timer').textContent).toContain('Még 01:59:59')

    act(() => vi.setSystemTime(SEASON_END))
    await act(() => vi.advanceTimersByTimeAsync(1000))

    expect(within(xmas).getByText('A vásárlási idő lejárt')).toBeTruthy()
    expect(within(xmas).getByText('Már nem vásárolható')).toBeTruthy()
    expect(within(xmas).queryByRole('button', { name: /Megvásárlás/ })).toBeNull()
  })

  /**
   * The cards were too empty (owner, 2026-11-17): the name in the rank's in-game
   * colour, its first three perks, and how it looks on the player in game (the
   * rank's prefix image from public/rank_icons/<group>.png, then their name).
   */
  it('a card shows the rank colour, its first three perks and how it looks on the player', async () => {
    backend(statsWith(null))
    renderPage()
    const heading = await screen.findByRole('heading', { name: 'Dragon' })
    const dragon = card('Dragon')

    expect(heading.style.color).toBe('rgb(229, 103, 90)')
    const perks = within(dragon).getByRole('list', { name: 'Fő előnyök' })
    expect(within(perks).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Repülés', 'Napi rúna', 'Extractor'])

    const preview = within(dragon).getByRole('figure', { name: 'Így néz ki rajtad a játékban' })
    expect(within(preview).getByRole('img', { name: 'Dragon' }).getAttribute('src')).toBe('/rank_icons/dragon.png')
    expect(within(preview).getByText('Shopper').style.color).toBe('rgb(229, 103, 90)')
  })

  it('a rank without a prefix image still shows the player name', async () => {
    backend(statsWith(null))
    renderPage()
    await screen.findByRole('heading', { name: 'Mage' })
    const preview = within(card('Mage')).getByRole('figure', { name: 'Így néz ki rajtad a játékban' })

    fireEvent.error(within(preview).getByRole('img', { name: 'Mage' }))

    expect(within(preview).queryByRole('img', { name: 'Mage' })).toBeNull()
    expect(within(preview).getByText('Shopper')).toBeTruthy()
  })

  it('a duration button opens the purchase on that duration', async () => {
    backend(statsWith(null))
    renderPage()
    await screen.findByRole('heading', { name: 'Mage' })

    fireEvent.click(within(card('Mage')).getByRole('button', { name: /Megvásárlás: 90 nap/ }))

    const dialog = await screen.findByRole('dialog', { name: 'Mage' })
    expect(within(dialog).getByRole('radio', { name: /90 nap/ }).getAttribute('aria-checked')).toBe('true')
  })

  it('without stats the ranks still show and none looks owned', async () => {
    backend('fails')
    renderPage()

    await screen.findByRole('heading', { name: 'Dragon' })
    expect(screen.getAllByRole('article')).toHaveLength(3)
    expect(screen.queryByText(/Aktív eddig/)).toBeNull()
  })

  it('when the ranks cannot be loaded it says so and can try again', async () => {
    backend(statsWith(null), 'fails')
    renderPage()

    expect(await screen.findByText('A rangokat most nem sikerült betölteni.')).toBeTruthy()

    backend(statsWith(null))
    fireEvent.click(screen.getByRole('button', { name: 'Újrapróbálás' }))
    expect(await screen.findByRole('heading', { name: 'Dragon' })).toBeTruthy()
  })
})

describe('the "Mit kapsz?" dialog', { timeout: 15_000 }, () => {
  it('shows the rank text as one document, and leads to buying', async () => {
    backend(statsWith(null))
    renderPage()
    await screen.findByRole('heading', { name: 'Dragon' })
    fireEvent.click(within(card('Dragon')).getByRole('button', { name: /Mit kapsz/ }))

    const dialog = await screen.findByRole('dialog', { name: 'Dragon' })
    expect(within(dialog).getByText('Egy erős rang.')).toBeTruthy()
    expect(within(dialog).getByRole('heading', { name: 'Globális' })).toBeTruthy()
    expect(within(dialog).getByRole('heading', { name: 'Kingdoms' })).toBeTruthy()
    expect(within(dialog).getByText('Repülés')).toBeTruthy()
    expect(within(dialog).queryByRole('tab')).toBeNull()

    fireEvent.click(within(dialog).getByRole('button', { name: /Megvásárlás: 90 nap/ }))
    expect(await screen.findByText('Mennyi időre szeretnéd?')).toBeTruthy()
    expect(screen.getByRole('radio', { name: /90 nap/ }).getAttribute('aria-checked')).toBe('true')
  })

  it('the season ending while it is open turns its button off', async () => {
    backend(statsWith(null))
    renderPage()
    await screen.findByRole('heading', { name: 'Karácsony' })
    fireEvent.click(within(card('Karácsony')).getByRole('button', { name: /Mit kapsz/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Karácsony' })

    act(() => vi.setSystemTime(SEASON_END))
    await act(() => vi.advanceTimersByTimeAsync(1000))

    expect(within(dialog).getByText('Már nem vásárolható')).toBeTruthy()
    expect(within(dialog).queryByRole('button', { name: /Megvásárlás/ })).toBeNull()
  })
})
