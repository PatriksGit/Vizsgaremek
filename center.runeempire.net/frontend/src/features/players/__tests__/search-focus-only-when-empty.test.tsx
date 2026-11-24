/**
 * Regression test (review 2026-11-24, ranks-players RK-K3; advisor, 2026-11-24): the search box always took the focus
 * on arrival (autoFocus), so back from a profile ("Vissza a kereséshez", ?q= kept) a phone's keyboard popped up again
 * over the kept results. It takes the focus only when the search is empty.
 *
 * Fakes only the edge: the API (vi.mock('@/lib/api')).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { PlayersPage } from '@/features/players/PlayersPage'
import { stubBrowserApis } from '@/test/fakeBackend'

const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api')>()
  return { ...original, http: { get: getMock } }
})

beforeEach(() => {
  stubBrowserApis()
  getMock.mockResolvedValue({ data: { data: [{ name: 'Patrik' }], meta: { more: 0 } } })
})

afterEach(() => {
  cleanup()
})

function renderPlayers(path: string) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/jatekosok" element={<PlayersPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return screen.getByRole('searchbox', { name: 'Játékosnév' })
}

it('back to a search with a query (?q=), the box does not take the focus', async () => {
  const box = renderPlayers('/jatekosok?q=pat')
  await screen.findByText('Patrik')
  expect(box).toHaveProperty('value', 'pat')
  expect(document.activeElement).not.toBe(box)
})

it('control: an empty search takes the focus, ready to type', () => {
  const box = renderPlayers('/jatekosok')
  expect(document.activeElement).toBe(box)
})
