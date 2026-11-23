/**
 * Regression test (review 2026-11-23, home H3): another player's profile speaks about the player (wording.ts,
 * "the ONLY source of these texts"), but the streak boxes' screen-reader text is StreakPanel's
 * fixed LOOK.text, written to the reader: on PatrikT's profile a screen reader hears
 * "Vasárnap (…): még nem léptél be" / "beléptél" about someone else.
 *
 * Fakes only the edge: the API (vi.mock('@/lib/api')).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { HomePage } from '@/features/home/HomePage'
import { PlayerProfilePage } from '@/features/players/PlayerProfilePage'
import { stubBrowserApis } from '@/test/fakeBackend'

const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api')>()
  return { ...original, http: { get: getMock } }
})
vi.mock('@/features/home/SkinViewer3D', () => ({ default: () => null }))

const stats = {
  runes: 0,
  playtime: { total_seconds: 0, week: [0, 0, 0, 0, 0, 0, 0] },
  streak: { current: 1, best: 2, week: ['done', 'missed', 'done', 'missed', 'missed', 'missed', 'pending'] },
  rank: { group: 'default', name: 'Játékos', expires_at: null, color: null },
  punishment: null,
  unavailable: [],
}
const account = { uuid: '00000000-0000-0000-0000-000000000080', username: 'reader', display_name: 'Reader', registered_at: '2026-01-01T10:00:00Z' }

beforeEach(() => {
  stubBrowserApis()
  getMock.mockReset()
  getMock.mockImplementation(async (url: string) => {
    if (url === '/auth/me') return { data: { data: account } }
    if (url === '/me/stats') return { data: { data: stats } }
    if (url === '/players/PatrikT/stats') return { data: { data: { ...stats, name: 'PatrikT', registered_at: null } } }
    if (url.endsWith('/friends')) return { data: { data: [] } }
    throw new Error(`no ${url} in this test`)
  })
})

afterEach(cleanup)

/** What a screen reader hears for the seven streak boxes. */
async function streakRead() {
  const list = await screen.findByRole('list', { name: 'Napi sorozat ezen a héten' })
  await within(list).findAllByText(/: /)
  return [...list.querySelectorAll('.sr-only')].map((element) => element.textContent?.replace(/^.*: /, ''))
}

it('repro: a profile\'s streak boxes speak about the player', async () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/jatekosok/PatrikT']}>
        <Routes>
          <Route path="jatekosok/:name" element={<PlayerProfilePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  // About PatrikT, not to the reader: no "beléptél", "még nem léptél be".
  expect((await streakRead()).filter((text) => text?.includes('léptél'))).toEqual([])
})

it('control: the own overview speaks to the player', async () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <HomePage />
    </QueryClientProvider>,
  )
  // The own overview speaks to the player: that is right there.
  expect(await streakRead()).toEqual(['beléptél', 'kimaradt', 'beléptél', 'kimaradt', 'kimaradt', 'kimaradt', 'még nem léptél be'])
})
