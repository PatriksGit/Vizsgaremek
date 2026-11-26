/**
 * Regression test (frontend review 2026-11-23).
 * AM-4: useOpenManagement has no "already checking" state. A second tap on the phone row's
 * "Megnyitás" while /management/me is on its way (a slow server: nothing on screen shows that
 * the first tap is working) shares the same fetch, and both handlers act on its answer:
 * signed in, navigate('/management') runs twice, so the Back button stays on /management;
 * signed out, window.location.assign() to the Google redirect runs twice.
 * Uses a data router (createMemoryRouter) like the app's createBrowserRouter.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { AccountPage } from '@/features/account/AccountPage'
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

const assign = vi.fn()
beforeAll(stubBrowserApis)
beforeEach(() => {
  vi.stubGlobal('location', { ...window.location, replace: vi.fn(), assign })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

function renderSettings(me: Reply) {
  let release: (() => void) | null = null
  installFakeBackend({
    'GET /auth/me': () => ({ status: 200, data: { data: ACCOUNT } }),
    // A slow server: the test decides when the check answers.
    'GET /management/me': () => new Promise<Reply>((resolve) => (release = () => resolve(me))),
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['account'], ACCOUNT)
  const router = createMemoryRouter(
    [
      {
        element: <Outlet />,
        children: [
          { path: 'beallitasok', element: <AccountPage /> },
          { path: 'management', element: <RequireManager><ManagementPage /></RequireManager>, children: [{ index: true, element: <ManagementHome /> }] },
        ],
      },
    ],
    { initialEntries: ['/beallitasok'] },
  )
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return {
    router,
    answer: async () => {
      await waitFor(() => expect(release).not.toBeNull())
      await act(async () => release?.())
    },
  }
}

async function tap(times: number, me: Reply) {
  const { router, answer } = renderSettings(me)
  const link = await screen.findByRole('link', { name: 'Megnyitás' })
  for (let i = 0; i < times; i++) fireEvent.click(link)
  await answer()
  return router
}

it('repro: two taps while the check runs still leave one /management entry: Back returns to the settings', async () => {
  const router = await tap(2, SIGNED_IN)
  expect(await screen.findByRole('link', { name: /Játékosok.*Keresés/ })).toBeTruthy()

  await act(() => router.navigate(-1))

  await waitFor(() => expect(router.state.location.pathname).toBe('/beallitasok'))
})

it('repro path2: two taps while the check runs start one navigation to Google, not two', async () => {
  await tap(2, SIGNED_OUT)
  await waitFor(() => expect(assign).toHaveBeenCalled())
  expect(assign).toHaveBeenCalledTimes(1)
})

it('control: one tap, then Back returns to the settings', async () => {
  const router = await tap(1, SIGNED_IN)
  expect(await screen.findByRole('link', { name: /Játékosok.*Keresés/ })).toBeTruthy()

  await act(() => router.navigate(-1))

  await waitFor(() => expect(router.state.location.pathname).toBe('/beallitasok'))
})

it('control path2: one tap starts one navigation to Google', async () => {
  await tap(1, SIGNED_OUT)
  await waitFor(() => expect(assign).toHaveBeenCalled())
  expect(assign).toHaveBeenCalledTimes(1)
})
