/**
 * Regression test (frontend review 2026-11-23).
 * AM-2: coming back to /management (the browser's Back button) after the 5 s fresh window,
 * the page refetches /management/me. When that refetch fails (a 5xx, a timeout, a 429, a 403
 * after the permission was taken away), TanStack keeps the old data and isFetchedAfterMount
 * turns true, so the earlier visit's "signed in" dashboard is shown although nothing confirmed it.
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
const SIGNED_OUT: Reply = { status: 200, data: { data: { signed_in: false } } }
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
  let answer = SIGNED_IN
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

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function visitHomeAndComeBack(next: () => void) {
  expect(await screen.findByRole('link', { name: /Játékosok.*Keresés/ })).toBeTruthy()
  // Away to the overview through the menu, then Back after the 5 s fresh window.
  fireEvent.click(screen.getAllByRole('link', { name: /Főoldal/ })[0])
  expect(await screen.findByRole('heading', { name: 'Főoldal' })).toBeTruthy()
  await wait(5_500)
  next()
  fireEvent.click(screen.getByRole('button', { name: 'Vissza (böngésző)' }))
}

it('repro: a failed re-check never shows the earlier visit\'s dashboard', { timeout: 15_000 }, async () => {
  const { next } = renderManagementThenHome(DOWN)
  await visitHomeAndComeBack(next)

  await waitFor(() => expect(screen.queryByRole('heading', { name: 'Főoldal' })).toBeNull())
  await wait(300)
  expect(screen.queryByRole('link', { name: /Játékosok.*Keresés/ })).toBeNull()
})

it('control: a re-check that answers "signed out" does not show the old dashboard and goes to Google', { timeout: 15_000 }, async () => {
  const { next } = renderManagementThenHome(SIGNED_OUT)
  await visitHomeAndComeBack(next)

  await waitFor(() => expect(replace).toHaveBeenCalledWith('/api/management/google/redirect'))
  expect(screen.queryByRole('link', { name: /Játékosok.*Keresés/ })).toBeNull()
})
