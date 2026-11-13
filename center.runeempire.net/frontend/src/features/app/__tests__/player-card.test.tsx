/**
 * The player card at the bottom of the sidebar opens the account menu
 * (Beállítások, Kijelentkezés) wherever it is clicked, not only on the gear
 * (owner, 2026-11-13).
 *
 * Harness only: a matchMedia stub (jsdom has none; SidebarProvider and
 * useIsMobile read it).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { AppLayout } from '@/features/app/AppLayout'
import { stubBrowserApis } from '@/test/fakeBackend'

const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api')>()
  return { ...original, http: { get: getMock } }
})

beforeEach(() => {
  stubBrowserApis()
  getMock.mockImplementation(async (url: string) => {
    if (url === '/auth/me') {
      return { data: { data: { uuid: 'u', username: 'cardplayer', display_name: 'CardPlayer', registered_at: null } } }
    }
    throw new Error(`unexpected GET ${url}`)
  })
})

afterEach(cleanup)

it('clicking the player\'s name opens the account menu', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<h1>Főoldal</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

  const card = await screen.findByRole('button', { name: 'Fiók menü' })
  fireEvent.click(await within(card).findByText('CardPlayer'))

  expect(await screen.findByRole('menuitem', { name: 'Beállítások' })).toBeTruthy()
  expect(screen.getByRole('menuitem', { name: 'Kijelentkezés' })).toBeTruthy()
})
