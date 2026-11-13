/**
 * Ranks in their colour (owner, 2026-11-13): the colour set in game with
 * `/lp group <group> meta set color #RRGGBB` colours the player's own rank on
 * the "Rangod" card, and each friend's name and rank label. A rank without a
 * colour keeps the neutral text colour; a friend whose rank could not be read
 * gets no label.
 *
 * Harness only: stubs for matchMedia and ResizeObserver (jsdom has neither),
 * the 3D skin viewer mocked to nothing (no WebGL).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { HomePage } from '@/features/home/HomePage'

const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api')>()
  return { ...original, http: { get: getMock } }
})
vi.mock('@/features/home/SkinViewer3D', () => ({ default: () => null }))

const account = {
  uuid: '00000000-0000-0000-0000-000000000003',
  username: 'rankuser',
  display_name: 'RankUser',
  registered_at: '2026-01-01T10:00:00Z',
}

/** #E5675A as the browser reads it back. */
const MANAGER_RED = 'rgb(229, 103, 90)'

beforeEach(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver

  getMock.mockImplementation(async (url: string) => {
    if (url === '/auth/me') return { data: { data: account } }
    if (url === '/me/friends') {
      return {
        data: {
          data: [
            { name: 'Anna', online: true, rank: { name: 'Manager', color: '#E5675A' } },
            { name: 'Bela', online: false, rank: { name: 'Játékos', color: null } },
            { name: 'Cili', online: false, rank: null },
          ],
        },
      }
    }
    if (url === '/me/stats') {
      return {
        data: {
          data: {
            runes: 0,
            playtime: { total_seconds: 0, week: [0, 0, 0, 0, 0, 0, 0] },
            streak: { current: 0, best: 0, week: ['missed', 'missed', 'pending', 'future', 'future', 'future', 'future'] },
            rank: { group: 'manager', name: 'Manager', expires_at: null, color: '#E5675A' },
            punishment: null,
            unavailable: [],
          },
        },
      }
    }
    throw new Error(`unexpected GET ${url}`)
  })
})

afterEach(cleanup)

function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <HomePage />
    </QueryClientProvider>,
  )
}

it('the player\'s own rank is shown in its colour', async () => {
  renderHome()
  const card = (await screen.findByText('Rangod')).closest('li')!

  expect((await within(card).findByText('Manager')).style.color).toBe(MANAGER_RED)
})

it('each friend\'s name and rank label take the rank\'s colour; no colour stays neutral', async () => {
  renderHome()
  const friends = await screen.findByRole('region', { name: 'Barátaid' })
  const anna = (await within(friends).findByText('Anna')).closest('li')!
  const bela = within(friends).getByText('Bela').closest('li')!
  const cili = within(friends).getByText('Cili').closest('li')!

  expect({
    annaName: within(anna).getByText('Anna').style.color,
    annaRank: within(anna).getByText('Manager').style.color,
    belaName: within(bela).getByText('Bela').style.color,
    belaRank: within(bela).queryByText('Játékos') !== null,
    ciliRank: cili.textContent,
  }).toEqual({
    annaName: MANAGER_RED,
    annaRank: MANAGER_RED,
    belaName: '',
    belaRank: true,
    ciliRank: 'CiliOffline',
  })
})

it('the runes card has the coin icon, like the menu', async () => {
  renderHome()
  const card = (await screen.findByText('Rúnáid')).closest('li')!

  expect(card.querySelector('svg[data-icon]')?.getAttribute('data-icon')).toBe('coins')
})

it('the rank card has the wizard hat icon, like the menu', async () => {
  renderHome()
  const card = (await screen.findByText('Rangod')).closest('li')!

  expect(card.querySelector('svg[data-icon]')?.getAttribute('data-icon')).toBe('hat-wizard')
})
