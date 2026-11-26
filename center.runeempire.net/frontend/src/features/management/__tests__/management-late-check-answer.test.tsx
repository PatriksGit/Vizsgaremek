/**
 * Regression test (frontend review 2026-11-23).
 * AM-8: useOpenManagement acts on its answer wherever the player is by then. Tap "Megnyitás",
 * then (the check is slow, nothing shows it is working) go to another page: the late answer still
 * pulls the player to /management, or, without a grant, off the site to Google.
 * Final review 2026-11-23 Minor 5: a late FAILURE (a 15 s timeout, a 5xx) still toasted on whatever page the
 * player was on by then.
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

const SERVER_ERROR: Reply = { status: 500, data: { message: 'Szerverhiba.' } }

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', async (importOriginal) => ({ ...(await importOriginal<typeof import('sonner')>()), toast: toastMock }))

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
    // The sidebar's peek stays unanswered: these tests are about the frame's and the menu's own asks.
    'GET /management/me?peek=1': () => new Promise<never>(() => {}),
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['account'], ACCOUNT)
  const router = createMemoryRouter(
    [
      {
        element: <Outlet />,
        children: [
          { index: true, element: <h1>Főoldal</h1> },
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

async function tapThenLeave(me: Reply, leave: boolean) {
  const { router, answer } = renderSettings(me)
  fireEvent.click(await screen.findByRole('link', { name: 'Megnyitás' }))
  // The player changes their mind and opens the overview from the menu.
  if (leave) await act(() => router.navigate('/'))
  await answer()
  await new Promise((resolve) => setTimeout(resolve, 100))
  return router
}

it('repro: a late "signed in" answer does not pull the player back from the page they went to', async () => {
  const router = await tapThenLeave(SIGNED_IN, true)
  expect(router.state.location.pathname).toBe('/')
})

it('repro path2: a late "signed out" answer does not send the player off to Google from another page', async () => {
  await tapThenLeave(SIGNED_OUT, true)
  expect(assign).not.toHaveBeenCalled()
})

it('control: staying on the page, the answer opens /management', async () => {
  const router = await tapThenLeave(SIGNED_IN, false)
  expect(router.state.location.pathname).toBe('/management')
})

it('control path2: staying on the page, no grant goes to Google', async () => {
  await tapThenLeave(SIGNED_OUT, false)
  expect(assign).toHaveBeenCalledTimes(1)
})

it('repro path3: a late failure does not toast on the page the player went to', async () => {
  await tapThenLeave(SERVER_ERROR, true)
  expect(toastMock.error).not.toHaveBeenCalled()
})

it('control path3: staying on the page, a failure toasts', async () => {
  await tapThenLeave(SERVER_ERROR, false)
  expect(toastMock.error).toHaveBeenCalledTimes(1)
})
