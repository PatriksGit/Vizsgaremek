/**
 * The rank shop (owner's design, Claude Design "Asztali – Rangok"), frontend
 * only: the cards, the "Mit kapsz?" dialog and the purchase dialog, whose final
 * button stays disabled until buying is wired.
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

function statsWith(rank: MyStats['rank'], runes = 5000): MyStats {
  return { runes, playtime: null, streak: null, rank, punishment: null, unavailable: [] }
}

function backend(stats: MyStats | 'fails') {
  getMock.mockImplementation(async (url: string) => {
    if (url === '/auth/me') return { data: { data: account } }
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
  it('lists every rank; the one the player has shows until when, with an extend button', async () => {
    backend(statsWith({ group: 'dragon', name: 'Dragon', expires_at: '2026-11-20T12:00:00Z', color: null }))
    renderPage()

    expect(await screen.findByText('Aktív eddig: 2026.11.20.')).toBeTruthy()
    expect(screen.getAllByRole('article')).toHaveLength(6)
    expect(within(card('Dragon')).getByRole('button', { name: 'Meghosszabbítás' })).toBeTruthy()
    expect(within(card('[KARÁCSONYI RANG]')).getByRole('button', { name: 'Megvásárlás' })).toBeTruthy()
    expect(within(card('Dragon')).getByRole('img', { name: 'Dragon rang animációja' })).toBeTruthy()
  })

  it('a seasonal rank counts down, then can no longer be bought', async () => {
    backend(statsWith(null))
    renderPage()
    const xmas = card('[KARÁCSONYI RANG]')

    expect(within(xmas).getByText('Szezonális')).toBeTruthy()
    expect(within(xmas).getByRole('timer').textContent).toContain('Még 40 nap 11:00:00')

    act(() => vi.setSystemTime(SEASON_END))
    await act(() => vi.advanceTimersByTimeAsync(1000))

    expect(within(xmas).getByText('A vásárlási idő lejárt')).toBeTruthy()
    expect(within(xmas).getByText('Már nem vásárolható')).toBeTruthy()
    expect(within(xmas).queryByRole('button', { name: 'Megvásárlás' })).toBeNull()
  })

  it('without stats the page still works and no rank looks owned', async () => {
    backend('fails')
    renderPage()

    await act(() => vi.advanceTimersByTimeAsync(100))
    expect(screen.getAllByRole('article')).toHaveLength(6)
    expect(screen.queryByText(/Aktív eddig/)).toBeNull()
  })
})

describe('the "Mit kapsz?" dialog', { timeout: 15_000 }, () => {
  it('shows the perks of each server, and leads to buying', async () => {
    backend(statsWith(null))
    renderPage()
    fireEvent.click(within(card('Dragon')).getByRole('button', { name: /Mit kapsz/ }))

    const dialog = await screen.findByRole('dialog', { name: 'Dragon' })
    expect(within(dialog).getByText('Előnyök szerverenként')).toBeTruthy()
    expect(within(dialog).getByText('[Szerver 1 – előny 1]')).toBeTruthy()

    fireEvent.click(within(dialog).getByRole('tab', { name: '[Szerver 2]' }))
    expect(await within(dialog).findByText('[Szerver 2 – előny 1]')).toBeTruthy()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Megvásárlás' }))
    expect(await screen.findByText('Mennyi időre szeretnéd?')).toBeTruthy()
  })

  it('the season ending while it is open turns its button off', async () => {
    backend(statsWith(null))
    renderPage()
    fireEvent.click(within(card('[KARÁCSONYI RANG]')).getByRole('button', { name: /Mit kapsz/ }))
    const dialog = await screen.findByRole('dialog', { name: '[KARÁCSONYI RANG]' })

    act(() => vi.setSystemTime(SEASON_END))
    await act(() => vi.advanceTimersByTimeAsync(1000))

    expect(within(dialog).getByText('Már nem vásárolható')).toBeTruthy()
    expect(within(dialog).queryByRole('button', { name: 'Megvásárlás' })).toBeNull()
  })
})
