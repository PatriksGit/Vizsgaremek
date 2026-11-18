/**
 * The Játékosok search (owner, 2026-11-17): live while typing from 2 letters,
 * at most 30 cards from the backend, then one card counting the rest
 * ("999+" above 999), "Erre a névre nincs találat" for none. Each `it` is one case.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { PlayersPage } from '@/features/players/PlayersPage'
import { ApiError } from '@/lib/api'
import { stubBrowserApis } from '@/test/fakeBackend'

const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api')>()
  return { ...original, http: { get: getMock } }
})

/** Answers the search with these names and this many more. */
function serve(names: string[], more = 0) {
  getMock.mockImplementation(async (url: string) => {
    if (url === '/players') return { data: { data: names.map((name) => ({ name })), meta: { more } } }
    throw new Error(`unexpected GET ${url}`)
  })
}

/** The search requests sent, by their q. */
const searches = () => getMock.mock.calls.filter(([url]) => url === '/players').map(([, config]) => config.params.q)

function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/jatekosok']}>
        <Routes>
          <Route path="jatekosok" element={<PlayersPage />} />
          <Route path="jatekosok/:name" element={<p>PROFIL</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const type = (text: string) => fireEvent.change(screen.getByRole('searchbox', { name: 'Játékosnév' }), { target: { value: text } })

beforeEach(() => {
  stubBrowserApis()
  getMock.mockReset()
})

afterEach(cleanup)

it('one letter asks nothing and says how many are needed', async () => {
  serve(['Patrik'])
  renderPage()
  type('P')

  await new Promise((resolve) => setTimeout(resolve, 400))
  expect(screen.getByText('Írj be legalább 2 betűt a névből.')).toBeTruthy()
  expect(searches()).toEqual([])
})

it('typing lists the matching players, each a link to their profile', async () => {
  serve(['PaBlo', 'Patrik'])
  renderPage()
  type('pa')

  const list = await screen.findByRole('list', { name: 'Találatok' })
  const links = within(list).getAllByRole('link')
  expect(links.map((link) => link.textContent)).toEqual(['PaBlo', 'Patrik'])
  expect(links[1].getAttribute('href')).toBe('/jatekosok/Patrik')
  expect(searches()).toEqual(['pa'])
})

it('typing quickly asks once, for what the box holds when typing pauses', async () => {
  serve(['Patrik'])
  renderPage()
  type('pa')
  type('pat')
  type('patr')

  await screen.findByRole('link', { name: 'Patrik' })
  expect(searches()).toEqual(['patr'])
})

it('the players past the first thirty are only counted', async () => {
  serve(['Patrik'], 2)
  renderPage()
  type('pa')

  expect(await screen.findByText('Még 2 játékos – írj be többet a névből')).toBeTruthy()
})

it('above 999 more the count says 999+', async () => {
  serve(['Patrik'], 1000)
  renderPage()
  type('pa')

  expect(await screen.findByText('Még 999+ játékos – írj be többet a névből')).toBeTruthy()
})

it('no match says so', async () => {
  serve([])
  renderPage()
  type('zz')

  expect(await screen.findByText('Erre a névre nincs találat')).toBeTruthy()
})

it('after a search without hits, the next query does not say "none" before its own answer', async () => {
  let release = () => {}
  getMock.mockImplementation(async (url: string, config: { params: { q: string } }) => {
    if (url !== '/players') throw new Error(`unexpected GET ${url}`)
    if (config.params.q === 'zz') return { data: { data: [], meta: { more: 0 } } }
    await new Promise<void>((resolve) => (release = resolve))
    return { data: { data: [{ name: 'Patrik' }], meta: { more: 0 } } }
  })
  renderPage()
  type('zz')
  await screen.findByText('Erre a névre nincs találat')

  type('pa')
  await waitFor(() => expect(searches()).toEqual(['zz', 'pa']))
  expect(screen.queryByText('Erre a névre nincs találat')).toBeNull()

  release()
  expect(await screen.findByRole('link', { name: 'Patrik' })).toBeTruthy()
})

/** Answers "pa" at once and holds every other search until release(). */
function serveSlowAfterPa(later: string[]) {
  let release = () => {}
  getMock.mockImplementation(async (url: string, config: { params: { q: string } }) => {
    if (url !== '/players') throw new Error(`unexpected GET ${url}`)
    if (config.params.q === 'pa') return { data: { data: [{ name: 'PaBlo' }, { name: 'PatrikT' }, { name: 'PatrikT2' }], meta: { more: 0 } } }
    await new Promise<void>((resolve) => (release = resolve))
    return { data: { data: later.map((name) => ({ name })), meta: { more: 0 } } }
  })
  return () => release()
}

const shownNames = () => screen.queryAllByRole('link').map((link) => link.textContent)

it('a new search after clearing the box never shows the earlier results (owner, 2026-11-18)', async () => {
  const release = serveSlowAfterPa(['Benike'])
  renderPage()
  type('pa')
  await screen.findByRole('link', { name: 'PatrikT2' })

  type('')
  type('b')
  type('be')
  await waitFor(() => expect(searches()).toEqual(['pa', 'be']))
  expect(shownNames()).toEqual([])

  release()
  await screen.findByRole('link', { name: 'Benike' })
  expect(shownNames()).toEqual(['Benike'])
})

it('typing on narrows the list at once, before the answer comes', async () => {
  const release = serveSlowAfterPa(['PatrikT', 'PatrikT2'])
  renderPage()
  type('pa')
  await screen.findByRole('link', { name: 'PaBlo' })

  type('pat')
  expect(shownNames()).toEqual(['PatrikT', 'PatrikT2'])

  await waitFor(() => expect(searches()).toEqual(['pa', 'pat']))
  release()
  await waitFor(() => expect(screen.getByRole('status').textContent).toBe('2 találat'))
})

it('a character no name has finds nobody without asking', async () => {
  serve(['Patrik'])
  renderPage()
  type('pa%')

  await new Promise((resolve) => setTimeout(resolve, 400))
  expect(screen.getByText('Erre a névre nincs találat')).toBeTruthy()
  expect(searches()).toEqual([])
})

it('a refused search shows the backend message', async () => {
  getMock.mockRejectedValue(new ApiError(429, 'Túl sok próbálkozás. Próbáld újra 1 perc múlva.', {}, { code: 'too_many_requests' }))
  renderPage()
  type('pa')

  expect((await screen.findByRole('alert')).textContent).toBe('Túl sok próbálkozás. Próbáld újra 1 perc múlva.')
})
