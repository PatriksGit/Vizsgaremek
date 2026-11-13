/**
 * Frontend review 2026-11-13, T3: the menu marks the open page by an exact string match
 * (nav.ts isActive, AppSidebar.tsx TopLink/SubLink `item.to === pathname`),
 * while react-router also opens the page for the same address with a
 * trailing slash. On /rangok/ the Rangok page shows, but no menu item is
 * marked as the current page, in the sidebar or the phone tab bar.
 *
 * Happens when: the player opens /rangok/ (a link pasted with a trailing slash).
 *
 * Harness only: a matchMedia stub (jsdom has none; SidebarProvider and
 * useIsMobile read it). The routes are App.tsx's: the layout route with the
 * menu page 'rangok' as its child.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { AppLayout } from '@/features/app/AppLayout'

const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api')>()
  return { ...original, http: { get: getMock } }
})

beforeEach(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia
  getMock.mockImplementation(async (url: string) => {
    if (url === '/auth/me') {
      return { data: { data: { uuid: 'u', username: 'reprouser', display_name: 'ReproUser', registered_at: null } } }
    }
    throw new Error(`unexpected GET ${url}`)
  })
})

afterEach(cleanup)

it('the open page is marked in the menu', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/rangok/']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="rangok" element={<h1>Rangok oldal</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

  // The router opened the page either way.
  expect(await screen.findByText('Rangok oldal')).toBeTruthy()

  const current = document.querySelectorAll('[aria-current="page"]')
  expect([...current].map((link) => link.textContent)).toEqual(['Rangok', 'Bolt'])
})
