/**
 * Regression test (frontend review 2026-11-23).
 * AM-1 path2: a first load of /management whose /me fails (5xx, timeout) shows the FailedCard.
 * Leaving and coming back with the Back button mounts the page on an errored query without data;
 * useManagementMe's retryOnMount: false then skips the fetch (query-core shouldLoadOnMount), so
 * isFetchedAfterMount never turns true and the page stays on the sr-only "Betöltés…": blank, nothing
 * asks again, although the server answers now.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { AppLayout } from '@/features/app/AppLayout'
import type { Account } from '@/features/auth/api'
import { ManagementHome } from '@/features/management/ManagementHome'
import { ManagementPage } from '@/features/management/ManagementPage'
import { RequireManager } from '@/features/management/RequireManager'
import { installFakeBackend, stubBrowserApis, type Reply } from '@/test/fakeBackend'

const ACCOUNT: Account = {
  uuid: 'u-1',
  username: 'steve_01',
  display_name: 'Steve_01',
  email: 'steve@example.com',
  two_factor_enabled: false,
  can_manage: true,
  registered_at: '2026-01-01T00:00:00Z',
}
const SIGNED_IN: Reply = { status: 200, data: { data: { signed_in: true, email: 'admin@example.com', expires_at: '2026-11-23T12:30:00Z' } } }
const DOWN: Reply = { status: 500, data: { message: 'Server Error' } }

const replace = vi.fn()
beforeAll(stubBrowserApis)
beforeEach(() => {
  vi.stubGlobal('location', { ...window.location, replace, assign: vi.fn() })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

/** Stands in for the browser's Back button. */
function Home() {
  const navigate = useNavigate()
  return (
    <>
      <h1>Főoldal</h1>
      <button type="button" onClick={() => navigate(-1)}>
        Vissza (böngésző)
      </button>
    </>
  )
}

function renderManagementThenHome(second: Reply) {
  let answer = DOWN
  installFakeBackend({
    'GET /auth/me': () => ({ status: 200, data: { data: ACCOUNT } }),
    'GET /management/me': () => answer,
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['account'], ACCOUNT)
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/management']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Home />} />
            <Route
              path="management"
              element={
                <RequireManager>
                  <ManagementPage />
                </RequireManager>
              }
            >
              <Route index element={<ManagementHome />} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return {
    next: () => {
      answer = second
    },
  }
}

async function failThenHomeAndBack(next: () => void) {
  expect(await screen.findByRole('alert')).toBeTruthy()
  fireEvent.click(screen.getAllByRole('link', { name: /Főoldal/ })[0])
  expect(await screen.findByRole('heading', { name: 'Főoldal' })).toBeTruthy()
  next()
  fireEvent.click(screen.getByRole('button', { name: 'Vissza (böngésző)' }))
  await waitFor(() => expect(screen.queryByRole('heading', { name: 'Főoldal' })).toBeNull())
}

it('repro path2: coming back after a failed first load asks again and shows the answer', async () => {
  const { next } = renderManagementThenHome(SIGNED_IN)
  await failThenHomeAndBack(next)

  expect(await screen.findByRole('link', { name: /Játékosok.*Keresés/ })).toBeTruthy()
})

it('control path2: a failed first load shows the reason, not a blank page', async () => {
  renderManagementThenHome(SIGNED_IN)

  // A 5xx without a management code: the app's usual message (review K1), not the sign-in text.
  expect((await screen.findByRole('alert')).textContent).toBe('Váratlan hiba történt, próbáld újra később.')
})
