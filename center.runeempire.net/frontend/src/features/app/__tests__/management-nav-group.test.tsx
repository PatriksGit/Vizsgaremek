/**
 * The sidebar's Management group (owner, 2026-11-26): with a live management
 * grant a collapsible group like Rúnák (Játékosok, Napló) shows under the main
 * menu. Its visibility is asked with /management/me?peek=1, which never slides
 * the 30-minute grant; while it shows, the account menu offers "Kilépés a
 * managementből" instead of "Management".
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { AppLayout } from '@/features/app/AppLayout'
import type { Account } from '@/features/auth/api'
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

const signedIn = (minutes = 30) => ({
  status: 200,
  data: { data: { signed_in: true, email: 'boss@example.com', expires_at: new Date(Date.now() + minutes * 60_000).toISOString() } },
})
const SIGNED_OUT = { status: 200, data: { data: { signed_in: false } } }

const originalAdapter = http.defaults.adapter
beforeAll(stubBrowserApis)
beforeEach(() => {
  vi.stubGlobal('location', { ...window.location, replace: vi.fn(), assign: vi.fn() })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  http.defaults.adapter = originalAdapter
})

let peek: () => Reply | Promise<Reply> = () => SIGNED_OUT
const meCalls: unknown[] = []

function renderAt(path: string, frameAnswer?: unknown) {
  meCalls.length = 0
  installFakeBackend({
    'GET /auth/me': () => ({ status: 200, data: { data: ACCOUNT } }),
    'GET /management/me?peek=1': () => {
      meCalls.push({ peek: 1 })
      return peek()
    },
    // A sliding ask would land here: the tests below check there is none.
    'GET /management/me': () => {
      meCalls.push({})
      return signedIn()
    },
    'POST /management/logout': () => ({ status: 204 }),
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['account'], ACCOUNT)
  if (frameAnswer !== undefined) client.setQueryData(['management', 'me', ACCOUNT.uuid], frameAnswer)
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<h1>Főoldal</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return client
}

// The sidebar's menu (the phone tab bar is a "Főmenü" too, but has no groups): the one where Rúnák opens.
const mainMenu = () =>
  screen.getAllByRole('navigation', { name: 'Főmenü' }).find((nav) => within(nav).queryByRole('button', { name: /Rúnák/ })) as HTMLElement
const group = () => within(mainMenu()).queryByRole('button', { name: /Management/ })

it('the group shows only while the grant is live', async () => {
  peek = () => signedIn()
  renderAt('/')

  await waitFor(() => expect(group()).not.toBeNull())
  const links = within(mainMenu()).getAllByRole('link').map((link) => link.getAttribute('href'))
  expect(links).toContain('/management/jatekosok')
  expect(links).toContain('/management/naplo')
  cleanup()

  peek = () => SIGNED_OUT
  renderAt('/')
  await waitFor(() => expect(meCalls).toHaveLength(1))
  expect(group()).toBeNull()
})

it('the group only peeks', async () => {
  peek = () => signedIn()
  renderAt('/')

  await waitFor(() => expect(group()).not.toBeNull())
  expect(meCalls.length).toBeGreaterThan(0)
  expect(meCalls.every((params) => (params as { peek?: unknown }).peek)).toBe(true)
})

it("the frame's answer shows the group without waiting for a peek", async () => {
  // The peek has not answered yet: the frame's answer is the newest one.
  peek = () => new Promise(() => {})
  renderAt('/', { signed_in: true, email: 'boss@example.com', expires_at: '2099-01-01T00:00:00Z' })

  await waitFor(() => expect(group()).not.toBeNull())
})

it('the menu offers Kilépés instead of Management while the group shows, and the logout removes the group', async () => {
  peek = () => signedIn()
  renderAt('/')
  await waitFor(() => expect(group()).not.toBeNull())

  fireEvent.click(screen.getByRole('button', { name: 'Fiók menü' }))
  await screen.findByRole('menuitem', { name: 'Beállítások' })
  expect(screen.queryByRole('menuitem', { name: 'Management' })).toBeNull()
  fireEvent.click(screen.getByRole('menuitem', { name: 'Kilépés a managementből' }))

  await waitFor(() => expect(group()).toBeNull())
  fireEvent.click(screen.getByRole('button', { name: 'Fiók menü' }))
  expect(await screen.findByRole('menuitem', { name: 'Management' })).toBeTruthy()
})

it('asks again (by peek) once the grant runs out, and hides the group when it did', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  peek = () => signedIn(1)
  renderAt('/')
  await waitFor(() => expect(group()).not.toBeNull())

  peek = () => SIGNED_OUT
  await act(async () => {
    await vi.advanceTimersByTimeAsync(62_000)
  })

  await waitFor(() => expect(group()).toBeNull())
  expect(meCalls.length).toBeGreaterThanOrEqual(2)
  expect(meCalls.every((params) => (params as { peek?: unknown }).peek)).toBe(true)
})

it("a lapse hides the group even after the frame answered (the newest answer wins; final review, Important 1)", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  peek = () => signedIn(1)
  renderAt('/', { signed_in: true, email: 'boss@example.com', expires_at: new Date(Date.now() + 60_000).toISOString() })
  await waitFor(() => expect(meCalls).toHaveLength(1))

  peek = () => SIGNED_OUT
  await act(async () => {
    await vi.advanceTimersByTimeAsync(62_000)
  })

  await waitFor(() => expect(group()).toBeNull())
})

it('a failed peek stops asking and hides the group, also over an older frame answer (final review, Important 2a)', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  peek = () => signedIn(1)
  renderAt('/', { signed_in: true, email: 'boss@example.com', expires_at: new Date(Date.now() + 60_000).toISOString() })
  await waitFor(() => expect(group()).not.toBeNull())

  peek = () => ({ status: 403, data: { message: 'Ehhez nincs jogosultságod.', code: 'management.forbidden' } })
  await act(async () => {
    await vi.advanceTimersByTimeAsync(62_000)
  })
  await waitFor(() => expect(group()).toBeNull())
  const asked = meCalls.length

  await act(async () => {
    await vi.advanceTimersByTimeAsync(10_000)
  })
  expect(meCalls).toHaveLength(asked)
})

it('a client clock ahead of the server never asks every second (final review, Important 2b)', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  // The server says live, but by this clock the grant ran out already.
  peek = () => ({ status: 200, data: { data: { signed_in: true, email: 'boss@example.com', expires_at: new Date(Date.now() - 60_000).toISOString() } } })
  renderAt('/')
  await waitFor(() => expect(meCalls).toHaveLength(1))

  await act(async () => {
    await vi.advanceTimersByTimeAsync(10_000)
  })
  expect(meCalls).toHaveLength(1)
})
