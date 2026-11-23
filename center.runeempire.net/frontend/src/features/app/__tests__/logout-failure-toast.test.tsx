/**
 * Frontend review 2026-11-23, app-shell S4 + account-management K3: a failed logout says why in a
 * toast from one place (useLogout's onError, lib/toastError), for both buttons: the sidebar's
 * account menu and the phones' Kijelentkezés on Beállítások. The player stays logged in.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'

import { AccountPage } from '@/features/account/AccountPage'
import { AppLayout } from '@/features/app/AppLayout'
import type { Account } from '@/features/auth/api'
import { installFakeBackend, stubBrowserApis } from '@/test/fakeBackend'

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', async (importOriginal) => ({ ...(await importOriginal<typeof import('sonner')>()), toast: toastMock }))

const ACCOUNT: Account = {
  uuid: 'u-1',
  username: 'steve_01',
  display_name: 'Steve_01',
  email: 'steve@example.com',
  two_factor_enabled: false,
  can_manage: false,
  registered_at: '2026-01-01T00:00:00Z',
}

const REFUSED = { status: 503, data: { message: 'A szolgáltatás most nem érhető el.', code: 'service_unavailable' } }

beforeAll(stubBrowserApis)
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderAt(path: string) {
  const calls = installFakeBackend({
    'GET /auth/me': () => ({ status: 200, data: { data: ACCOUNT } }),
    'POST /auth/logout': () => REFUSED,
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['account'], ACCOUNT)
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<h1>Főoldal</h1>} />
            <Route path="beallitasok" element={<AccountPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return calls
}

it('the account menu: a failed logout toasts the backend message and keeps the player in', async () => {
  const calls = renderAt('/')
  fireEvent.click(await screen.findByRole('button', { name: 'Fiók menü' }))
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Kijelentkezés' }))

  await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('A szolgáltatás most nem érhető el.'))
  expect(toastMock.error).toHaveBeenCalledTimes(1)
  expect(calls).toContain('POST /auth/logout')
  expect(screen.getByRole('heading', { name: 'Főoldal' })).toBeTruthy()
})

it('Beállítások on phones: a failed logout toasts the same way', async () => {
  renderAt('/beallitasok')
  fireEvent.click(await screen.findByRole('button', { name: 'Kijelentkezés' }))

  await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('A szolgáltatás most nem érhető el.'))
  expect(toastMock.error).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('heading', { name: 'Beállítások' })).toBeTruthy()
})
