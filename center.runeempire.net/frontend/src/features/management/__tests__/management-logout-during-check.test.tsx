/**
 * Regression test (frontend review 2026-11-23).
 * AM-5: "Megnyitás" tapped, then "Kijelentkezés" while /management/me is still on its way.
 * The logout's setAccount cancels every query, so useOpenManagement's fetchQuery rejects with
 * TanStack's CancelledError, and its catch toasts it as "Váratlan hiba történt, próbáld újra később."
 * although nothing went wrong: the player logged out on purpose.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { AccountPage } from '@/features/account/AccountPage'
import type { Account } from '@/features/auth/api'
import { RequireAccount } from '@/features/auth/guards'
import { installFakeBackend, stubBrowserApis, type Reply } from '@/test/fakeBackend'

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', async (importOriginal) => ({ ...(await importOriginal<typeof import('sonner')>()), toast: toastMock }))

const ACCOUNT: Account = {
  uuid: 'u-1',
  username: 'steve_01',
  display_name: 'Steve_01',
  email: 'steve@example.com',
  two_factor_enabled: false,
  can_manage: true,
  registered_at: '2026-01-01T00:00:00Z',
}

beforeAll(stubBrowserApis)
beforeEach(() => {
  vi.stubGlobal('location', { ...window.location, replace: vi.fn(), assign: vi.fn() })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

function renderSettings() {
  let release: (() => void) | null = null
  const calls = installFakeBackend({
    'GET /auth/me': () => ({ status: 200, data: { data: ACCOUNT } }),
    // A slow server: the check answers only when the test says so.
    'GET /management/me': () =>
      new Promise<Reply>((resolve) => (release = () => resolve({ status: 200, data: { data: { signed_in: false } } }))),
    'POST /auth/logout': () => ({ status: 204 }),
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['account'], ACCOUNT)
  render(
    <QueryClientProvider client={client}>
      {/* Behind the guard like in the app: after the logout it leaves the page instead of rendering it without an account. */}
      <MemoryRouter initialEntries={['/beallitasok']}>
        <Routes>
          <Route
            path="beallitasok"
            element={
              <RequireAccount>
                <AccountPage />
              </RequireAccount>
            }
          />
          <Route path="login" element={<h1>Belépés</h1>} />
          <Route path="/" element={<h1>Főoldal</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { calls, client, answer: () => release?.(), asked: () => release !== null }
}

it('repro: logging out while the management check runs shows no error toast', async () => {
  const { calls, client, answer, asked } = renderSettings()
  fireEvent.click(await screen.findByRole('link', { name: 'Megnyitás' }))
  await waitFor(() => expect(asked()).toBe(true))

  fireEvent.click(screen.getByRole('button', { name: 'Kijelentkezés' }))
  await waitFor(() => expect(client.getQueryData(['account'])).toBeNull())
  expect(calls).toContain('POST /auth/logout')
  await act(async () => answer())
  await new Promise((resolve) => setTimeout(resolve, 100))

  expect(toastMock.error).not.toHaveBeenCalled()
})

it('control: the same check without a logout shows no error toast', async () => {
  const { answer, asked } = renderSettings()
  fireEvent.click(await screen.findByRole('link', { name: 'Megnyitás' }))
  await waitFor(() => expect(asked()).toBe(true))

  await act(async () => answer())
  await new Promise((resolve) => setTimeout(resolve, 100))

  expect(toastMock.error).not.toHaveBeenCalled()
})
