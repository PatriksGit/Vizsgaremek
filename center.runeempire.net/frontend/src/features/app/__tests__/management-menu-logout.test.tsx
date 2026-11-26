/**
 * "Management kilépés" lives in the account menu (owner, 2026-11-26), under
 * the Management row, and on phones on Beállítások: only while the cached
 * /management/me answer says signed in. It never asks /management/me itself
 * (each call slides the 30-minute grant). Rendered with the real management
 * frame, so "home, not Google" is really checked.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { AccountPage } from '@/features/account/AccountPage'
import { AppLayout } from '@/features/app/AppLayout'
import type { Account } from '@/features/auth/api'
import { ManagementHome } from '@/features/management/ManagementHome'
import { ManagementLogPage } from '@/features/management/ManagementLogPage'
import { ManagementPage } from '@/features/management/ManagementPage'
import { RequireManager } from '@/features/management/RequireManager'
import { http } from '@/lib/api'
import { installFakeBackend, stubBrowserApis, type Reply } from '@/test/fakeBackend'

const ACCOUNT: Account = {
  uuid: 'u-1',
  username: 'boss',
  display_name: 'Boss',
  email: 'boss@example.com',
  two_factor_enabled: false,
  can_manage: true,
  registered_at: '2026-01-01T00:00:00Z',
}

const GRANT = { signed_in: true, email: 'boss@example.com', expires_at: '2026-11-26T12:30:00Z' }

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

let meAnswer: Reply = { status: 200, data: { data: GRANT } }

function renderAt(path: string, me: unknown = undefined) {
  meAnswer = { status: 200, data: { data: GRANT } }
  const calls = installFakeBackend({
    'GET /auth/me': () => ({ status: 200, data: { data: ACCOUNT } }),
    'GET /management/me': () => meAnswer,
    // The sidebar's peek stays unanswered: these tests are about the frame's cached answer.
    'GET /management/me?peek=1': () => new Promise<Reply>(() => {}),
    'GET /management/actions': () => ({ status: 200, data: { data: [], meta: { next_cursor: null } } }),
    'POST /management/logout': () => ({ status: 204 }),
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['account'], ACCOUNT)
  if (me !== undefined) client.setQueryData(['management', 'me', ACCOUNT.uuid], me)
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
            >
              <Route index element={<ManagementHome />} />
              <Route path="naplo" element={<ManagementLogPage />} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { calls, client }
}

async function openMenu() {
  fireEvent.click(await screen.findByRole('button', { name: 'Fiók menü' }))
  await screen.findByRole('menuitem', { name: 'Beállítások' })
}

it('the menu row shows only with a cached signed-in answer', async () => {
  renderAt('/', { signed_in: false })
  await openMenu()
  expect(screen.queryByRole('menuitem', { name: 'Management kilépés' })).toBeNull()
  cleanup()

  renderAt('/', GRANT)
  await openMenu()
  expect(screen.getByRole('menuitem', { name: 'Management kilépés' })).toBeTruthy()
})

it('the menu row reads the cache only', async () => {
  const { calls } = renderAt('/')
  await openMenu()

  expect(screen.queryByRole('menuitem', { name: 'Management kilépés' })).toBeNull()
  expect(calls).not.toContain('GET /management/me')
})

it('menu logout from a tool page goes home, not to Google', async () => {
  const { calls } = renderAt('/management/naplo')
  await screen.findByRole('heading', { level: 1, name: 'Napló' })
  await openMenu()

  fireEvent.click(screen.getByRole('menuitem', { name: 'Management kilépés' }))

  expect(await screen.findByRole('heading', { name: 'Főoldal' })).toBeTruthy()
  expect(calls).toContain('POST /management/logout')
  expect(replace).not.toHaveBeenCalled()
  expect(assign).not.toHaveBeenCalled()
})

it('after the logout the menu no longer offers it (final review 2026-11-26, Important 1)', async () => {
  renderAt('/management/naplo')
  await screen.findByRole('heading', { level: 1, name: 'Napló' })
  await openMenu()
  fireEvent.click(screen.getByRole('menuitem', { name: 'Management kilépés' }))
  await screen.findByRole('heading', { name: 'Főoldal' })

  await openMenu()
  expect(screen.queryByRole('menuitem', { name: 'Management kilépés' })).toBeNull()
})

it('every /management/me observer carries retry false, so no re-check ever retries (final review, Minor 2)', async () => {
  const { client } = renderAt('/', GRANT)
  // The app's default (src/queryClient.ts) retries 5xx and network errors; this test client's own default would hide it.
  client.setDefaultOptions({ queries: { retry: 2 } })
  // Re-render the menu alone (a new account object), as a mutation's state change would.
  client.setQueryData(['account'], { ...ACCOUNT, email: 'boss2@example.com' })
  await openMenu()

  const query = client.getQueryCache().find({ queryKey: ['management', 'me', ACCOUNT.uuid] })
  expect(query?.options.retry).toBe(false)
})


it('Beállítások shows the logout row on phones only while signed in', async () => {
  renderAt('/beallitasok', { signed_in: false })
  await screen.findByRole('heading', { level: 1, name: 'Beállítások' })
  expect(screen.queryByRole('button', { name: 'Management kilépés' })).toBeNull()
  cleanup()

  renderAt('/beallitasok', GRANT)
  const button = await screen.findByRole('button', { name: 'Management kilépés' })
  expect(button.closest('.md\\:hidden')).not.toBeNull()

  fireEvent.click(button)
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Főoldal' })).toBeTruthy())
})
