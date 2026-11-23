/**
 * Regression tests (review 2026-11-23, ranks-players K1 and K2).
 * K1: on /jatekosok?q=pat the menu's Játékosok link led to /jatekosok, but the search box read the address only on
 * mount: it kept "pat", and 250 ms later the debounce wrote ?q=pat back. The box now follows an address change that
 * is not its own write. (Found while fixing it: comparing the address with the box's text undid a letter typed while
 * the box's own write was on its way, so the page remembers what it wrote.)
 * K2: search -> a profile -> that player's friend -> "Vissza: <name>" opened the first profile without router state,
 * so its back link "Vissza a kereséshez" led to /jatekosok without the ?q=. A friend's back link now carries the
 * profile's own back link.
 *
 * Fakes only the edges: the API (vi.mock('@/lib/api')) and the 3D viewer module (WebGL).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PlayerProfilePage } from '@/features/players/PlayerProfilePage'
import { PlayersPage } from '@/features/players/PlayersPage'
import { stubBrowserApis } from '@/test/fakeBackend'

const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api')>()
  return { ...original, http: { get: getMock } }
})
vi.mock('@/features/home/SkinViewer3D', () => ({ default: () => null }))

const stats = (name: string) => ({
  name,
  registered_at: '2026-10-01T09:30:00+00:00',
  runes: 0,
  playtime: { total_seconds: 0, week: [0, 0, 0, 0, 0, 0, 0] },
  streak: { current: 0, best: 0, week: ['missed', 'missed', 'missed', 'missed', 'missed', 'missed', 'pending'] },
  rank: { group: 'default', name: 'Játékos', expires_at: null, color: null },
  punishment: null,
  unavailable: [],
})
const friend = (name: string) => ({ name, online: false, has_profile: true, rank: null })

beforeEach(() => {
  stubBrowserApis()
  vi.useFakeTimers({ shouldAdvanceTime: true, now: new Date('2026-11-23T12:00:00Z') })
  getMock.mockReset()
  getMock.mockImplementation(async (url: string) => {
    if (url === '/players') return { data: { data: [{ name: 'Patrik' }], meta: { more: 0 } } }
    if (url === '/players/Patrik/stats') return { data: { data: stats('Patrik') } }
    if (url === '/players/Patrik/friends') return { data: { data: [friend('Bence')] } }
    if (url === '/players/Bence/stats') return { data: { data: stats('Bence') } }
    if (url === '/players/Bence/friends') return { data: { data: [friend('Patrik')] } }
    if (url === '/discord-widget') throw new Error('no discord in this test')
    throw new Error(`unexpected GET ${url}`)
  })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

/** The address the router is on, for the assertions. */
function Address() {
  const location = useLocation()
  return <output data-testid="address">{location.pathname + location.search}</output>
}

function renderPlayers(path = '/jatekosok') {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        {/* Stands in for the menu's Játékosok link. */}
        <Link to="/jatekosok">Játékosok menü</Link>
        <Address />
        <Routes>
          <Route path="jatekosok" element={<PlayersPage />} />
          <Route path="jatekosok/:name" element={<PlayerProfilePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const address = () => screen.getByTestId('address').textContent
const box = () => screen.getByRole('searchbox', { name: 'Játékosnév' }) as HTMLInputElement

async function typeAndWait(value: string) {
  fireEvent.change(box(), { target: { value } })
  await act(() => vi.advanceTimersByTimeAsync(300))
}

describe('K1: the menu link on the search page', { timeout: 15_000 }, () => {
  it('repro: Játékosok on /jatekosok?q=pat empties the box and the address stays /jatekosok', async () => {
    renderPlayers()
    await typeAndWait('pat')
    expect(address()).toBe('/jatekosok?q=pat')

    fireEvent.click(screen.getByRole('link', { name: 'Játékosok menü' }))
    await act(() => vi.advanceTimersByTimeAsync(300))

    expect(box().value).toBe('')
    // Harm: the debounce wrote the old text back.
    expect(address()).toBe('/jatekosok')
  })

  it('control: typing writes the query to the address once it pauses', async () => {
    renderPlayers()
    await typeAndWait('pat')
    await typeAndWait('patr')

    expect(box().value).toBe('patr')
    expect(address()).toBe('/jatekosok?q=patr')
  })

  it('repro: a letter typed while the box\'s own write is on its way is kept', async () => {
    renderPlayers()
    fireEvent.change(box(), { target: { value: 'pa' } })
    // The debounce fires outside act, so the router's update is still pending when the next key comes.
    vi.advanceTimersByTime(250)
    fireEvent.change(box(), { target: { value: 'pat' } })
    await act(() => vi.advanceTimersByTimeAsync(300))

    expect(box().value).toBe('pat')
    expect(address()).toBe('/jatekosok?q=pat')
  })
})

describe('K2: the back-link chain', { timeout: 15_000 }, () => {
  it('repro: search -> profile -> friend -> back keeps the search\'s ?q= on the profile\'s back link', async () => {
    renderPlayers()
    await typeAndWait('pa')
    fireEvent.click(within(await screen.findByRole('list', { name: 'Találatok' })).getByRole('link', { name: 'Patrik' }))
    fireEvent.click(await screen.findByRole('link', { name: /Bence/ }))
    fireEvent.click(await screen.findByRole('link', { name: 'Vissza: Patrik' }))

    expect(address()).toBe('/jatekosok/Patrik')
    // Harm: the link led to /jatekosok, the search gone.
    expect(screen.getByRole('link', { name: 'Vissza a kereséshez' }).getAttribute('href')).toBe('/jatekosok?q=pa')
  })

  it('control: the profile opened from the search links back to it', async () => {
    renderPlayers()
    await typeAndWait('pa')
    fireEvent.click(within(await screen.findByRole('list', { name: 'Találatok' })).getByRole('link', { name: 'Patrik' }))

    expect((await screen.findByRole('link', { name: 'Vissza a kereséshez' })).getAttribute('href')).toBe('/jatekosok?q=pa')
  })
})
