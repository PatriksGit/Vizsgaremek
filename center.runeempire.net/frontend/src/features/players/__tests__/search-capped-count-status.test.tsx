/**
 * Review 2026-11-24 RK-1: the backend stops counting at 1000 more (PlayerSearchController MORE_CAP), so meta.more = 1000 means "1000 or
 * more". The visible card says "Még 999+ játékos"; the screen-reader status added the 30 listed to the capped count and
 * read an exact "1030 találat", however many players really match.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { PlayersPage } from '@/features/players/PlayersPage'
import { stubBrowserApis } from '@/test/fakeBackend'

const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api')>()
  return { ...original, http: { get: getMock } }
})

const thirty = Array.from({ length: 30 }, (_, index) => ({ name: `Pa${String(index).padStart(2, '0')}` }))

function serve(more: number) {
  getMock.mockImplementation(async (url: string) => {
    if (url === '/players') return { data: { data: thirty, meta: { more } } }
    throw new Error(`unexpected GET ${url}`)
  })
}

async function search() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/jatekosok']}>
        <Routes>
          <Route path="jatekosok" element={<PlayersPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  fireEvent.change(screen.getByRole('searchbox', { name: 'Játékosnév' }), { target: { value: 'pa' } })
  await screen.findByRole('list', { name: 'Találatok' })
  return screen.getAllByRole('status').map((status) => status.textContent?.replace(/\s/g, ' '))
}

beforeEach(() => {
  stubBrowserApis()
  getMock.mockReset()
})

afterEach(cleanup)

it('a capped count is read out as "Legalább N találat"', async () => {
  serve(1000) // the backend's cap: 1000 or more besides the 30 listed
  const statuses = await search()
  expect(screen.getByText(/999\+ játékos/)).toBeTruthy() // the visible card knows it is capped
  // Harm: the screen reader hears "1030 találat", a number the backend never counted.
  expect(statuses).not.toContain('1030 találat') // hu-HU groups only from five digits
  expect(statuses).toContain('Legalább 1030 találat')
})

it('control: an uncapped count is read out exactly', async () => {
  serve(12)
  expect(await search()).toContain('42 találat')
})
