/**
 * Another player's profile, /jatekosok/<name> (owner, 2026-11-17): the
 * overview's dashboard with that player's numbers and friends, its labels
 * about the player; an unknown name says so. Each `it` is one case.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { PlayerProfilePage } from '@/features/players/PlayerProfilePage'
import { ApiError } from '@/lib/api'
import { stubBrowserApis } from '@/test/fakeBackend'

const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api')>()
  return { ...original, http: { get: getMock } }
})
vi.mock('@/features/home/SkinViewer3D', () => ({ default: () => null }))

const profile = {
  name: 'PatrikT',
  registered_at: '2026-10-01T09:30:00+00:00',
  runes: 1250,
  playtime: { total_seconds: 7200, week: [0, 0, 0, 0, 0, 0, 0] },
  streak: { current: 0, best: 0, week: ['missed', 'missed', 'missed', 'missed', 'missed', 'missed', 'pending'] },
  rank: { group: 'default', name: 'Játékos', expires_at: null, color: null },
  punishment: null,
  unavailable: [],
}

function serve(stats: () => unknown, friends: unknown[] = []) {
  getMock.mockImplementation(async (url: string) => {
    if (url === '/players/PatrikT/stats') return { data: { data: stats() } }
    if (url === '/players/PatrikT/friends') return { data: { data: friends } }
    if (url === '/discord-widget') throw new Error('down')
    throw new Error(`unexpected GET ${url}`)
  })
}

const asked = (url: string) => getMock.mock.calls.filter(([called]) => called === url).length

function renderProfile(path = '/jatekosok/PatrikT') {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="jatekosok/:name" element={<PlayerProfilePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  stubBrowserApis()
  getMock.mockReset()
})

afterEach(cleanup)

it('shows the player’s numbers and friends with labels about the player', async () => {
  serve(() => profile, [{ name: 'Barat', online: true, has_profile: true, rank: { name: 'Játékos', color: null } }])
  renderProfile()

  // hu-HU groups digits only from five on.
  expect(await screen.findByText('1250')).toBeTruthy()
  expect(screen.getByRole('heading', { level: 1, name: 'PatrikT' })).toBeTruthy()
  for (const label of ['Rúnái', 'Játékideje', 'Rangja', 'Büntetései', 'Barátai']) expect(screen.getByText(label)).toBeTruthy()
  expect(screen.queryByText('Rúnáid')).toBeNull()
  expect(await screen.findByText('Barat')).toBeTruthy()
})

it('an unknown player says so and is not asked again', async () => {
  serve(() => {
    throw new ApiError(404, 'Nincs ilyen játékos.', {}, { code: 'players.not_found' })
  })
  renderProfile()

  expect(await screen.findByRole('heading', { name: 'Nincs ilyen játékos' })).toBeTruthy()
  expect(asked('/players/PatrikT/stats')).toBe(1)
})

it('a friend without a website account is shown but not linked (repro review 2026-11-18, F1)', async () => {
  serve(() => profile, [
    { name: 'Barat', online: false, has_profile: true, rank: null },
    { name: 'RegiJatekos', online: false, has_profile: false, rank: null },
  ])
  renderProfile()

  expect((await screen.findByText('Barat')).closest('a')?.getAttribute('href')).toBe('/jatekosok/Barat')
  expect(screen.getByText('RegiJatekos').closest('a')).toBeNull()
})

it('a refusal for asking too often is not asked again at once and shows dashes, not "no such player"', async () => {
  serve(() => {
    throw new ApiError(429, 'Túl sok próbálkozás. Próbáld újra 1 perc múlva.', {}, { code: 'too_many_requests' })
  })
  renderProfile()

  expect(await screen.findByText('Rúnái')).toBeTruthy()
  await screen.findAllByText('(most nem érhető el)', { exact: false })
  expect(asked('/players/PatrikT/stats')).toBe(1)
  expect(screen.queryByRole('heading', { name: 'Nincs ilyen játékos' })).toBeNull()
})

it('a name no player can have says so without asking', () => {
  serve(() => profile)
  renderProfile('/jatekosok/a%20b')

  expect(screen.getByRole('heading', { name: 'Nincs ilyen játékos' })).toBeTruthy()
  expect(getMock).not.toHaveBeenCalled()
})

it('a friend opens their own profile, whose back link returns to the first one', async () => {
  getMock.mockImplementation(async (url: string) => {
    if (url === '/players/PatrikT/stats') return { data: { data: profile } }
    if (url === '/players/PatrikT/friends') return { data: { data: [{ name: 'Barat', online: false, has_profile: true, rank: null }] } }
    if (url === '/players/Barat/stats') return { data: { data: { ...profile, name: 'Barat', runes: 7 } } }
    if (url === '/players/Barat/friends') return { data: { data: [] } }
    throw new Error(`unexpected GET ${url}`)
  })
  renderProfile()

  fireEvent.click(await screen.findByRole('link', { name: /Barat/ }))

  expect(await screen.findByRole('heading', { level: 1, name: 'Barat' })).toBeTruthy()
  expect(await screen.findByText('7')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Vissza: PatrikT' }).getAttribute('href')).toBe('/jatekosok/PatrikT')
})

it('the back link returns to the search the player came from', async () => {
  serve(() => profile)
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[{ pathname: '/jatekosok/PatrikT', state: { back: { to: '/jatekosok?q=pat', label: 'Vissza a kereséshez' } } }]}>
        <Routes>
          <Route path="jatekosok/:name" element={<PlayerProfilePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

  expect(screen.getByRole('link', { name: 'Vissza a kereséshez' }).getAttribute('href')).toBe('/jatekosok?q=pat')
})
