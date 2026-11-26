/**
 * The Management hub (owner, 2026-11-26): /management shows only the tool
 * cards, no title; each tool has its own page under it with a back link, and
 * every page goes through the one sign-in frame (ManagementPage).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { AppLayout } from '@/features/app/AppLayout'
import { isAccountArea } from '@/features/app/nav'
import type { Account } from '@/features/auth/api'
import { ManagementHome } from '@/features/management/ManagementHome'
import { ManagementLogPage } from '@/features/management/ManagementLogPage'
import { ManagementPage } from '@/features/management/ManagementPage'
import { ManagementPlayersPage } from '@/features/management/ManagementPlayersPage'
import { RequireManager } from '@/features/management/RequireManager'
import { http } from '@/lib/api'
import { installFakeBackend, stubBrowserApis, type Handler } from '@/test/fakeBackend'

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', async (importOriginal) => ({ ...(await importOriginal<typeof import('sonner')>()), toast: toastMock }))

const GOOGLE = '/api/management/google/redirect'

const ACCOUNT: Account = {
  uuid: 'u-1',
  username: 'boss',
  display_name: 'Boss',
  email: 'boss@example.com',
  two_factor_enabled: false,
  can_manage: true,
  registered_at: '2026-01-01T00:00:00Z',
}

const SIGNED_OUT = { status: 200, data: { data: { signed_in: false } } }
const SIGNED_IN = { status: 200, data: { data: { signed_in: true, email: 'boss@example.com', expires_at: '2026-11-26T12:30:00Z' } } }

const replace = vi.fn()
const assign = vi.fn()
const originalAdapter = http.defaults.adapter

beforeAll(stubBrowserApis)
beforeEach(() => {
  vi.stubGlobal('location', { ...window.location, replace, assign })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  http.defaults.adapter = originalAdapter
})

function renderAt(path: string, me: Handler = () => SIGNED_IN) {
  installFakeBackend({
    'GET /auth/me': () => ({ status: 200, data: { data: ACCOUNT } }),
    'GET /management/me': me,
    // The sidebar's peek stays unanswered: these tests are about the frame's and the menu's own asks.
    'GET /management/me?peek=1': () => new Promise<never>(() => {}),
    'GET /management/actions': () => ({ status: 200, data: { data: [], meta: { next_cursor: null } } }),
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['account'], ACCOUNT)
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<h1>Főoldal</h1>} />
            <Route
              path="management"
              element={
                <RequireManager>
                  <ManagementPage />
                </RequireManager>
              }
            >
              <Route index element={<ManagementHome />} />
              <Route path="jatekosok" element={<ManagementPlayersPage />} />
              <Route path="naplo" element={<ManagementLogPage />} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('hub shows the two tool cards and no visible title', async () => {
  renderAt('/management')

  const players = await screen.findByRole('link', { name: /Játékosok.*Keresés/ })
  expect(players.getAttribute('href')).toBe('/management/jatekosok')
  expect(screen.getByRole('link', { name: /Napló.*staff/ }).getAttribute('href')).toBe('/management/naplo')
  // One h1 for screen readers, but nothing on screen.
  expect(screen.getByRole('heading', { level: 1, name: 'Management' }).className).toContain('sr-only')
  // The sign-in panel is gone: the logout lives in the account menu now.
  expect(screen.queryByText(/Bejelentkezve:/)).toBeNull()
})

it('a card opens its tool page with a back link', async () => {
  renderAt('/management')

  fireEvent.click(await screen.findByRole('link', { name: /Játékosok.*Keresés/ }))

  expect(await screen.findByRole('heading', { level: 1, name: 'Játékosok' })).toBeTruthy()
  expect(screen.getByRole('searchbox', { name: 'Játékosnév' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Vissza a Managementhez' }).getAttribute('href')).toBe('/management')
})

/**
 * Owner, 2026-11-26: on desktop the sidebar's Management group navigates, so the back link to the hub is for
 * phones only (no sidebar there); a small "Management" kicker above the title says where the page belongs
 * (the sidebar has two "Napló"s).
 */
it('the back link is for phones only and a Management kicker sits above the title', async () => {
  renderAt('/management/naplo')

  const title = await screen.findByRole('heading', { level: 1, name: 'Napló' })
  expect(screen.getByRole('link', { name: 'Vissza a Managementhez' }).className).toContain('md:hidden')
  expect(title.previousElementSibling?.textContent).toBe('Management')
})

it('the Napló page shows the log', async () => {
  renderAt('/management/naplo')

  expect(await screen.findByRole('heading', { level: 1, name: 'Napló' })).toBeTruthy()
  expect(await screen.findByText('Még nincs bejegyzés.')).toBeTruthy()
})

it('tool page without a grant forwards to Google', async () => {
  renderAt('/management/jatekosok?by=ip&q=85', () => SIGNED_OUT)

  await waitFor(() => expect(replace).toHaveBeenCalledWith(GOOGLE))
  expect(screen.queryByRole('searchbox')).toBeNull()
})

it('refused sign-in on a tool path toasts and goes home', async () => {
  renderAt('/management/naplo?error=management.not_allowed&email=x%40example.com')

  expect(await screen.findByRole('heading', { name: 'Főoldal' })).toBeTruthy()
  expect(toastMock.error).toHaveBeenCalled()
  expect(replace).not.toHaveBeenCalled()
})

it('the tool pages count as the account area like the hub', () => {
  expect(isAccountArea('/management')).toBe(true)
  expect(isAccountArea('/management/naplo')).toBe(true)
  expect(isAccountArea('/managementx')).toBe(false)
})
