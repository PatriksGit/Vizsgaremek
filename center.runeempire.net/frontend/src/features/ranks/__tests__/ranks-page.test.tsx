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
  { group: 'karacsony', name: 'Karácsony', details: DETAILS, gif_url: null, prefix_url: null, prices: prices(1500), season_ends_at: SEASON_END.toISOString(), color: null },
  { group: 'dragon', name: 'Dragon', details: DETAILS, gif_url: '/ranks/dragon.gif', prefix_url: '/rank_icons/dragon.png', prices: prices(2000), season_ends_at: null, color: '#E5675A' },
  { group: 'mage', name: 'Mage', details: DETAILS, gif_url: null, prefix_url: null, prices: prices(1000), season_ends_at: null, color: null },
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

/** Hungarian numbers group with a no-break space. */
const text = (element: HTMLElement) => element.textContent?.replace(/\s/g, ' ')

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
    // Review 2026-11-17, F5: the card titles follow the page's h1, no level skipped.
    expect(within(card('Dragon')).getByRole('heading', { level: 2, name: 'Dragon' })).toBeTruthy()
    // A 30 / 90 nap switch, the chosen duration's price and one buy button (owner, 2026-11-17).
    expect((within(card('Dragon')).getByRole('radio', { name: '+30 nap' }) as HTMLInputElement).checked).toBe(true)
    expect(within(card('Dragon')).getByRole('button', { name: 'Meghosszabbítom: Dragon, 30 nap' })).toBeTruthy()
    expect((within(card('Mage')).getByRole('radio', { name: '30 nap' }) as HTMLInputElement).checked).toBe(true)
    expect(within(card('Mage')).getByRole('button', { name: 'Megveszem: Mage, 30 nap' })).toBeTruthy()
    expect(text(within(card('Dragon')).getByText(/\d rúna$/))).toBe('2000 rúna')
    expect(text(within(card('Mage')).getByText(/\d rúna$/))).toBe('1000 rúna')
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
    expect(within(xmas).queryByRole('button', { name: /^Megveszem/ })).toBeNull()
  })

  /**
   * The cards were too empty (owner, 2026-11-17): the name in the rank's in-game
   * colour and how it looks on the player in game (the rank's prefix image from
   * the database, then their name). The perks stay in "Mit kapsz?" only.
   */
  it('a card shows the rank colour and how it looks on the player, not the perks', async () => {
    backend(statsWith(null))
    renderPage()
    const heading = await screen.findByRole('heading', { name: 'Dragon' })
    const dragon = card('Dragon')

    expect(heading.style.color).toBe('rgb(229, 103, 90)')
    expect(within(dragon).queryByText('Repülés')).toBeNull()

    const preview = within(dragon).getByRole('figure', { name: 'Játékbeli kinézet' })
    expect(within(preview).getByRole('img', { name: 'Dragon' }).getAttribute('src')).toBe('/rank_icons/dragon.png')
    expect(within(preview).getByText('Shopper').style.color).toBe('rgb(229, 103, 90)')
  })

  /**
   * The switch picks the duration (owner, 2026-11-17): the price follows it, the
   * 90-day option carries its real discount against the 30-day price, and the
   * one buy button buys the chosen duration.
   */
  it('the switch picks the duration: the price, the discount and the buy button follow it', async () => {
    backend(statsWith(null))
    renderPage()
    await screen.findByRole('heading', { name: 'Mage' })
    const mage = card('Mage')
    const ninety = within(mage).getByRole('radio', { name: '90 nap -13% kedvezmény' })

    fireEvent.click(ninety)

    expect((ninety as HTMLInputElement).checked).toBe(true)
    expect(text(within(mage).getByText(/\d rúna$/))).toBe('2600 rúna')
    fireEvent.click(within(mage).getByRole('button', { name: 'Megveszem: Mage, 90 nap' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Biztosan szeretnéd megvásárolni a rangot?' })
    expect(within(dialog).getByText('Mage · 90 nap')).toBeTruthy()
    expect(text(within(dialog).getByText(/^2600/))).toBe('2600 rúna')
  })

  /**
   * Each card in its rank colour (owner, 2026-11-17), the site gold without one.
   * No level numbers and no "Legmagasabb rang" (owner, 2026-11-17: not needed).
   */
  it('a card wears its rank colour, without a level or a "highest" badge', async () => {
    backend(statsWith(null))
    renderPage()
    await screen.findByRole('heading', { name: 'Mage' })

    expect(card('Dragon').style.getPropertyValue('--c')).toBe('#E5675A')
    expect(card('Mage').style.getPropertyValue('--c')).toBe('var(--primary)')
    expect(screen.queryByText(/szint/)).toBeNull()
    expect(screen.queryByText('Legmagasabb rang')).toBeNull()
  })

  /** The in-game look right under the name, then the link to the rank text (owner, 2026-11-17). */
  it('the in-game look comes right after the name, then "Tudj meg többet a rangról"', async () => {
    backend(statsWith(null))
    renderPage()
    await screen.findByRole('heading', { name: 'Dragon' })
    const dragon = card('Dragon')
    const preview = within(dragon).getByRole('figure', { name: 'Játékbeli kinézet' })
    const more = within(dragon).getByRole('button', { name: 'Tudj meg többet a rangról: Dragon' })

    expect(preview.compareDocumentPosition(more) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(more.textContent).toBe('Tudj meg többet a rangról')
  })

  /** No server chips anywhere (owner, 2026-11-17: removed, the rank text says what it gives where). */
  it('a card does not list the servers', async () => {
    backend(statsWith(null))
    renderPage()
    await screen.findByRole('heading', { name: 'Dragon' })

    expect(within(card('Dragon')).queryByRole('list', { name: 'Szerverek' })).toBeNull()
  })

  it('a rank without a prefix image, or with a broken one, still shows the player name', async () => {
    backend(statsWith(null))
    renderPage()
    await screen.findByRole('heading', { name: 'Mage' })
    const magePreview = within(card('Mage')).getByRole('figure', { name: 'Játékbeli kinézet' })
    expect(within(magePreview).queryByRole('img', { name: 'Mage' })).toBeNull()
    expect(within(magePreview).getByText('Shopper')).toBeTruthy()

    const dragonPreview = within(card('Dragon')).getByRole('figure', { name: 'Játékbeli kinézet' })
    fireEvent.error(within(dragonPreview).getByRole('img', { name: 'Dragon' }))
    expect(within(dragonPreview).queryByRole('img', { name: 'Dragon' })).toBeNull()
  })

  /** A press checks the runes first (owner, 2026-11-17). */
  it('too few runes for it says so instead of asking', async () => {
    backend(statsWith(null, 5000))
    renderPage()
    await screen.findByRole('heading', { name: 'Dragon' })

    fireEvent.click(within(card('Dragon')).getByRole('radio', { name: /^90 nap/ }))
    fireEvent.click(within(card('Dragon')).getByRole('button', { name: 'Megveszem: Dragon, 90 nap' }))

    expect(await screen.findByRole('alertdialog', { name: 'Nincs elég rúnád a rang megvásárlásához.' })).toBeTruthy()
  })

  it('without stats the ranks still show and none looks owned', async () => {
    backend('fails')
    renderPage()

    await screen.findByRole('heading', { name: 'Dragon' })
    expect(screen.getAllByRole('article')).toHaveLength(3)
    expect(screen.queryByText(/Aktív eddig/)).toBeNull()
  })

  /** The balance above the ranks (owner, 2026-11-17): every button has a price, so the runes show too. */
  it('shows the balance above the ranks, with a way to top it up', async () => {
    backend(statsWith(null, 12500))
    renderPage()

    const balance = await screen.findByRole('region', { name: 'Egyenleged' })
    await vi.waitFor(() => expect(balance.textContent?.replace(/\s/g, ' ')).toContain('12 500 rúna'))
    expect(within(balance).getByRole('link', { name: 'Rúna-feltöltés' }).getAttribute('href')).toBe('/runak/vasarlas')
  })

  it('a balance that cannot be read is a dash', async () => {
    backend('fails')
    renderPage()

    const balance = await screen.findByRole('region', { name: 'Egyenleged' })
    await vi.waitFor(() => expect(balance.textContent).toContain('—'))
  })

  /** Review 2026-11-17, F3: a fresh database, or every rank removed in the management section. */
  it('an empty shop says so instead of showing an empty page', async () => {
    backend(statsWith(null), [])
    renderPage()

    expect(await screen.findByText('Most nincs megvásárolható rang.')).toBeTruthy()
    expect(screen.queryAllByRole('article')).toHaveLength(0)
  })

  it('when the ranks cannot be loaded it says so and can try again', async () => {
    backend(statsWith(null), 'fails')
    renderPage()

    expect(await screen.findByText('A rangokat most nem sikerült betölteni.')).toBeTruthy()

    backend(statsWith(null))
    fireEvent.click(screen.getByRole('button', { name: 'Újrapróbálás' }))
    expect(await screen.findByRole('heading', { name: 'Dragon' })).toBeTruthy()
  })

  /**
   * Review 2026-11-17: TanStack v5 makes a refetch of a failed query without data pending again;
   * gated on isError, the pressed button turned into skeletons. It stays, switched off, until the answer.
   */
  it('"Újrapróbálás" stays on screen, switched off, while it tries again', async () => {
    backend(statsWith(null), 'fails')
    renderPage()
    await screen.findByText('A rangokat most nem sikerült betölteni.')

    backend(statsWith(null))
    const answer = getMock.getMockImplementation()!
    let release!: () => void
    const held = new Promise<void>((resolve) => (release = resolve))
    getMock.mockImplementation(async (url: string) => {
      if (url === '/ranks') await held
      return answer(url)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Újrapróbálás' }))

    await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Újrapróbálás' })).toHaveProperty('disabled', true))
    expect(screen.getByText('A rangokat most nem sikerült betölteni.')).toBeTruthy()

    release()
    expect(await screen.findByRole('heading', { name: 'Dragon' })).toBeTruthy()
  })
})

describe('the "Mit kapsz?" dialog', { timeout: 15_000 }, () => {
  it('shows the rank text as one document, and leads to buying', async () => {
    backend(statsWith(null))
    renderPage()
    await screen.findByRole('heading', { name: 'Dragon' })
    fireEvent.click(within(card('Dragon')).getByRole('button', { name: /Tudj meg többet/ }))

    const dialog = await screen.findByRole('dialog', { name: 'Dragon' })
    expect(within(dialog).getByText('Egy erős rang.')).toBeTruthy()
    expect(within(dialog).getByRole('heading', { name: 'Globális' })).toBeTruthy()
    expect(within(dialog).getByRole('heading', { name: 'Kingdoms' })).toBeTruthy()
    expect(within(dialog).getByText('Repülés')).toBeTruthy()
    expect(within(dialog).queryByRole('tab')).toBeNull()

    // Complete without the card: the rank colour and the balance above the buttons; no server chips.
    expect(within(dialog).getByRole('heading', { name: 'Dragon' }).style.color).toBe('rgb(229, 103, 90)')
    expect(within(dialog).queryByRole('list', { name: 'Szerverek' })).toBeNull()
    expect(within(dialog).getByText(/Egyenleged/).textContent?.replace(/\s/g, ' ')).toBe('Egyenleged: 5000 rúna')

    expect(text(within(dialog).getByText(/^2000/))).toBe('2000 rúna')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Megveszem: Dragon, 30 nap' }))
    const confirm = await screen.findByRole('alertdialog', { name: 'Biztosan szeretnéd megvásárolni a rangot?' })
    expect(within(confirm).getByText('Dragon · 30 nap')).toBeTruthy()
  })

  it('the season ending while it is open turns its button off', async () => {
    backend(statsWith(null))
    renderPage()
    await screen.findByRole('heading', { name: 'Karácsony' })
    fireEvent.click(within(card('Karácsony')).getByRole('button', { name: /Tudj meg többet/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Karácsony' })

    act(() => vi.setSystemTime(SEASON_END))
    await act(() => vi.advanceTimersByTimeAsync(1000))

    expect(within(dialog).getByText('Már nem vásárolható')).toBeTruthy()
    expect(within(dialog).queryByRole('button', { name: /^Megveszem/ })).toBeNull()
  })

  it('shows until when the player has the rank', async () => {
    backend(statsWith({ group: 'dragon', name: 'Dragon', expires_at: '2026-11-20T12:00:00Z', color: null }))
    renderPage()
    await screen.findByText('Aktív eddig: 2026.11.20.')
    fireEvent.click(within(card('Dragon')).getByRole('button', { name: 'Tudj meg többet a rangról: Dragon' }))

    const dialog = await screen.findByRole('dialog', { name: 'Dragon' })
    expect(within(dialog).getByText('Aktív eddig: 2026.11.20.')).toBeTruthy()
  })
})
