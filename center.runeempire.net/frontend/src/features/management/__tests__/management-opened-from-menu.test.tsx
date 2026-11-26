/**
 * Regression test (frontend review 2026-11-23).
 * AM-1: the dashboard opened from the menu disappears once its 5 s "fresh" window ends.
 * The menu's fetchQuery answers before the page mounts, so isFetchedAfterMount stays false;
 * when the data turns stale TanStack's stale timer re-renders the observer and the page
 * falls back to the sr-only "Betöltés…" with nothing to refetch it.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { AppLayout } from '@/features/app/AppLayout'
import type { Account } from '@/features/auth/api'
import { ManagementHome } from '@/features/management/ManagementHome'
import { ManagementPage } from '@/features/management/ManagementPage'
import { RequireManager } from '@/features/management/RequireManager'
import { installFakeBackend, stubBrowserApis } from '@/test/fakeBackend'

const ACCOUNT: Account = {
  uuid: 'u-1',
  username: 'steve_01',
  display_name: 'Steve_01',
  email: 'steve@example.com',
  two_factor_enabled: false,
  can_manage: true,
  registered_at: '2026-01-01T00:00:00Z',
}
const SIGNED_IN = { status: 200, data: { data: { signed_in: true, email: 'admin@example.com', expires_at: '2026-11-23T12:30:00Z' } } }

beforeAll(stubBrowserApis)
beforeEach(() => {
  vi.stubGlobal('location', { ...window.location, replace: vi.fn(), assign: vi.fn() })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderAt(path: string) {
  installFakeBackend({
    'GET /auth/me': () => ({ status: 200, data: { data: ACCOUNT } }),
    'GET /management/me': () => SIGNED_IN,
    // The sidebar's peek stays unanswered: these tests are about the frame's and the menu's own asks.
    'GET /management/me?peek=1': () => new Promise<never>(() => {}),
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
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

it('repro: the dashboard opened from the menu is still there 6 s later', { timeout: 15_000 }, async () => {
  renderAt('/')
  fireEvent.click(await screen.findByRole('button', { name: 'Fiók menü' }))
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Management' }))
  expect(await screen.findByRole('link', { name: /Játékosok.*Keresés/ })).toBeTruthy()

  await wait(6_000)

  expect(screen.queryByRole('link', { name: /Játékosok.*Keresés/ })).not.toBeNull()
})

it('control: the dashboard loaded directly (bookmark, refresh) is still there 6 s later', { timeout: 15_000 }, async () => {
  renderAt('/management')
  expect(await screen.findByRole('link', { name: /Játékosok.*Keresés/ })).toBeTruthy()

  await wait(6_000)

  expect(screen.queryByRole('link', { name: /Játékosok.*Keresés/ })).not.toBeNull()
})
