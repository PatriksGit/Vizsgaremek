/**
 * Review 2026-11-24 AC-1: after "Kilépés a managementből", the browser's Back to an earlier /management entry within
 * 5 s of the last check showed the ended dashboard ("Bejelentkezve: ...") again, with no new check.
 * The cached signed_in: true answer was still fresh, so freshOnArrival trusted it.
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
import { installFakeBackend, stubBrowserApis } from '@/test/fakeBackend'

/** The logout moved into the account menu (owner, 2026-11-26). */
async function logOutOfManagement() {
  fireEvent.click(await screen.findByRole('button', { name: 'Fiók menü' }))
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Kilépés a managementből' }))
}


const ACCOUNT: Account = {
  uuid: 'u-1',
  username: 'steve_01',
  display_name: 'Steve_01',
  email: 'steve@example.com',
  two_factor_enabled: false,
  can_manage: true,
  registered_at: '2026-01-01T00:00:00Z',
}
const SIGNED_OUT = { status: 200, data: { data: { signed_in: false } } }
const SIGNED_IN = { status: 200, data: { data: { signed_in: true, email: 'admin@example.com', expires_at: '2026-11-23T12:30:00Z' } } }

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

function Home() {
  const navigate = useNavigate()
  return (
    <>
      <h1>Főoldal</h1>
      <button onClick={() => navigate(-1)}>Böngésző Vissza</button>
    </>
  )
}

function renderApp() {
  let signedIn = true
  const calls = installFakeBackend({
    'GET /auth/me': () => ({ status: 200, data: { data: ACCOUNT } }),
    'GET /management/me': () => (signedIn ? SIGNED_IN : SIGNED_OUT),
    'POST /management/logout': () => {
      signedIn = false
      return { status: 204 }
    },
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['account'], ACCOUNT)
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>
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
  return calls
}

async function openFromMenu() {
  fireEvent.click(await screen.findByRole('button', { name: 'Fiók menü' }))
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Management' }))
  await screen.findByRole('link', { name: /Játékosok.*Keresés/ })
}

/** Home -> Management (menu) -> Management again (menu, a second history entry) -> Kilépés -> home. */
async function openTwiceThenLogOut() {
  await openFromMenu()
  await openFromMenu()
  await logOutOfManagement()
  await screen.findByRole('heading', { name: 'Főoldal' })
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

it('Back right after Kilépés does not show the ended management dashboard', async () => {
  const calls = renderApp()
  await openTwiceThenLogOut()

  fireEvent.click(screen.getByRole('button', { name: 'Böngésző Vissza' }))
  await screen.findByRole('heading', { name: 'Management', level: 1 }).catch(() => null)
  await wait(50)

  // The grant was dropped at the server: the page must ask again (and go to Google), not show the old answer.
  expect(screen.queryByRole('link', { name: /Játékosok.*Keresés/ })).toBeNull()
  expect(calls.filter((call) => call === 'GET /management/me')).toHaveLength(3)
})

it('control: Back after the 5 s fresh window asks again and goes to Google', { timeout: 15_000 }, async () => {
  const calls = renderApp()
  await openTwiceThenLogOut()
  await wait(5_500)

  fireEvent.click(screen.getByRole('button', { name: 'Böngésző Vissza' }))

  await waitFor(() => expect(replace).toHaveBeenCalledWith('/api/management/google/redirect'))
  expect(screen.queryByRole('link', { name: /Játékosok.*Keresés/ })).toBeNull()
  expect(calls.filter((call) => call === 'GET /management/me')).toHaveLength(3)
})
