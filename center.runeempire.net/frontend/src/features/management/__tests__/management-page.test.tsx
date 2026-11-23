/**
 * The Management menu item and the /management page (owner, 2026-11-23): no
 * login card. The menu goes straight to the backend's Google redirect, which
 * skips Google when the grant is still live; a signed-out /management forwards
 * there at once, and only a failed sign-in (?error=) stops on an error screen.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { AccountPage } from '@/features/account/AccountPage'
import { AppLayout } from '@/features/app/AppLayout'
import type { Account } from '@/features/auth/api'
import { ManagementPage } from '@/features/management/ManagementPage'
import { RequireManager } from '@/features/management/RequireManager'
import { installFakeBackend, stubBrowserApis, type Handler } from '@/test/fakeBackend'

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', async (importOriginal) => ({ ...(await importOriginal<typeof import('sonner')>()), toast: toastMock }))

const GOOGLE = '/api/management/google/redirect'

const ACCOUNT: Account = {
  uuid: 'u-1',
  username: 'steve_01',
  display_name: 'Steve_01',
  email: 'steve@example.com',
  two_factor_enabled: false,
  can_manage: true,
  registered_at: '2026-01-01T00:00:00Z',
}

// The page leaves the SPA with location.replace: jsdom cannot navigate, so every test gets a stub.
const replace = vi.fn()

beforeAll(stubBrowserApis)
beforeEach(() => {
  vi.stubGlobal('location', { ...window.location, replace })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

const SIGNED_OUT = { status: 200, data: { data: { signed_in: false } } }
const SIGNED_IN = { status: 200, data: { data: { signed_in: true, email: 'admin@example.com', expires_at: '2026-11-23T12:30:00Z' } } }

function renderAt(path: string, account: Account, me: Handler = () => SIGNED_OUT, logout: Handler = () => ({ status: 204 })) {
  const calls = installFakeBackend({
    'GET /auth/me': () => ({ status: 200, data: { data: account } }),
    'GET /management/me': me,
    'POST /management/logout': logout,
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['account'], account)
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<h1>Főoldal</h1>} />
            <Route path="beallitasok" element={<AccountPage />} />
            <Route
              path="management"
              element={
                <RequireManager>
                  <ManagementPage />
                </RequireManager>
              }
            />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return calls
}

it('the Management menu item is a full-page link to the Google redirect, only with can_manage', async () => {
  renderAt('/', ACCOUNT)
  fireEvent.click(await screen.findByRole('button', { name: 'Fiók menü' }))
  const item = await screen.findByRole('menuitem', { name: 'Management' })
  expect(item.tagName).toBe('A')
  expect(item.getAttribute('href')).toBe(GOOGLE)
  cleanup()

  renderAt('/', { ...ACCOUNT, can_manage: false })
  fireEvent.click(await screen.findByRole('button', { name: 'Fiók menü' }))
  await screen.findByRole('menuitem', { name: 'Beállítások' })
  expect(screen.queryByRole('menuitem', { name: 'Management' })).toBeNull()
})

it('the settings page has a Management row linking to the Google redirect, only with can_manage', async () => {
  renderAt('/beallitasok', ACCOUNT)
  const link = await screen.findByRole('link', { name: 'Megnyitás' })
  expect(link.getAttribute('href')).toBe(GOOGLE)
  cleanup()

  renderAt('/beallitasok', { ...ACCOUNT, can_manage: false })
  await screen.findByRole('heading', { level: 1, name: 'Beállítások' })
  expect(screen.queryByRole('link', { name: 'Megnyitás' })).toBeNull()
})

it('/management without can_manage goes home', async () => {
  const calls = renderAt('/management', { ...ACCOUNT, can_manage: false })
  expect(await screen.findByRole('heading', { name: 'Főoldal' })).toBeTruthy()
  expect(calls).not.toContain('GET /management/me')
})

it('signed out without an error forwards to the Google redirect at once, with no login card', async () => {
  renderAt('/management', ACCOUNT)
  await waitFor(() => expect(replace).toHaveBeenCalledWith(GOOGLE))
  expect(replace).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('status').textContent).toBe('Átirányítás a Google-belépéshez…')
  expect(screen.queryByText('Management belépés')).toBeNull()
  expect(document.title).toBe('Management | RuneEmpire')
})

it('a failed sign-in shows the error screen with a retry link and no redirect', async () => {
  renderAt('/management?error=management.google_failed', ACCOUNT)
  expect(await screen.findByText('A Google-belépés most nem sikerült, próbáld újra.')).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Management belépés' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Újrapróbálás' }).getAttribute('href')).toBe(GOOGLE)
  expect(screen.getByRole('link', { name: 'Vissza a főoldalra' }).getAttribute('href')).toBe('/')
  expect(replace).not.toHaveBeenCalled()
})

it('an unknown or empty error code shows the generic text, never the raw parameter, and never redirects', async () => {
  renderAt('/management?error=<script>', ACCOUNT)
  expect(await screen.findByText('A belépés nem sikerült.')).toBeTruthy()
  expect(document.body.innerHTML).not.toContain('script')
  cleanup()

  renderAt('/management?error=', ACCOUNT)
  expect(await screen.findByText('A belépés nem sikerült.')).toBeTruthy()
  expect(replace).not.toHaveBeenCalled()
})

it('the throttle error uses the backend text', async () => {
  renderAt('/management?error=too_many_requests', ACCOUNT)
  expect(await screen.findByText('Túl sok próbálkozás, próbáld újra később.')).toBeTruthy()
})

it('not_allowed shows the address Google returned, but only when it is an address', async () => {
  renderAt('/management?error=management.not_allowed&email=stranger%40example.com', ACCOUNT)
  expect(await screen.findByText('Ez az e-mail cím nem jogosult a belépésre.')).toBeTruthy()
  expect(screen.getByText('Ezzel a címmel próbáltad: stranger@example.com')).toBeTruthy()
  cleanup()

  renderAt('/management?error=management.not_allowed&email=Hívj%20fel%20a%20%2B36...', ACCOUNT)
  expect(await screen.findByText('Ez az e-mail cím nem jogosult a belépésre.')).toBeTruthy()
  expect(screen.queryByText(/Ezzel a címmel próbáltad/)).toBeNull()
})

it('signed in shows the address and the placeholder; Kilépés calls the logout and goes home, not to Google', async () => {
  const calls = renderAt('/management', ACCOUNT, () => SIGNED_IN)
  expect(await screen.findByRole('heading', { level: 1, name: 'Management' })).toBeTruthy()
  expect(screen.getByText('Bejelentkezve: admin@example.com')).toBeTruthy()
  expect(screen.getByText('Itt lesznek majd a kezelési eszközök.')).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Kilépés a managementből' }))

  expect(await screen.findByRole('heading', { name: 'Főoldal' })).toBeTruthy()
  expect(calls).toContain('POST /management/logout')
  expect(calls.filter((call) => call === 'GET /management/me')).toHaveLength(1)
  expect(replace).not.toHaveBeenCalled()
})

it('a failed logout toasts the error and stays signed in', async () => {
  renderAt('/management', ACCOUNT, () => SIGNED_IN, () => ({ status: 500, data: { message: 'Hiba történt.' } }))
  fireEvent.click(await screen.findByRole('button', { name: 'Kilépés a managementből' }))
  await waitFor(() => expect(toastMock.error).toHaveBeenCalled())
  expect(screen.getByText('Bejelentkezve: admin@example.com')).toBeTruthy()
})
