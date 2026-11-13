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
 * useIsMobile read it). The routes are App.tsx's: the layout route with a
 * menu page as its child.
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

function renderMenuOn(address: string, path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[address]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path={path} element={<h1>Megnyitott oldal</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** The labels of the menu links marked as the open page, sidebar first, then the phone tab bar. */
const currentLinks = () => [...document.querySelectorAll('[aria-current="page"]')].map((link) => link.textContent)

it('the open page is marked in the menu', async () => {
  renderMenuOn('/rangok/', 'rangok')

  // The router opened the page either way.
  expect(await screen.findByText('Megnyitott oldal')).toBeTruthy()
  expect(currentLinks()).toEqual(['Rangok', 'Rangok'])
})

it('a page in the Rúnák group marks itself in the sidebar and Rúnák on the tab bar', async () => {
  renderMenuOn('/runak/vasarlas/', 'runak/vasarlas')

  expect(await screen.findByText('Megnyitott oldal')).toBeTruthy()
  expect(currentLinks()).toEqual(['Vásárlás', 'Rúnák'])
})

it('the overview is called Főoldal in the menu', async () => {
  renderMenuOn('/', '/')

  expect(await screen.findByText('Megnyitott oldal')).toBeTruthy()
  expect(currentLinks()).toEqual(['Főoldal', 'Főoldal'])
})

it('the runes have the coin icon in the menu', async () => {
  renderMenuOn('/runak/vasarlas/', 'runak/vasarlas')

  expect(await screen.findByText('Megnyitott oldal')).toBeTruthy()
  const runeLinks = screen.getAllByText('Rúnák').map((label) => label.closest('a, button')!)
  expect(runeLinks.map((link) => link.querySelector('svg')?.getAttribute('data-icon'))).toEqual(['coins', 'coins'])
})

it('the ranks have the wizard hat icon in the menu', async () => {
  renderMenuOn('/rangok', 'rangok')

  expect(await screen.findByText('Megnyitott oldal')).toBeTruthy()
  const rankLinks = screen.getAllByText('Rangok').map((label) => label.closest('a')!)
  expect(rankLinks.map((link) => link.querySelector('svg')?.getAttribute('data-icon'))).toEqual(['hat-wizard', 'hat-wizard'])
})
