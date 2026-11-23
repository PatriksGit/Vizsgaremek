/**
 * Regression test (frontend review 2026-11-23).
 * AUTH-4: queries.ts keeps "the last session ended with the player's own
 * logout" in a module flag that only setAccount (a login in THIS tab) clears.
 * Logged out here, logged in again in another tab, this tab picks the account
 * up on its next /auth/me (focus refetch): the flag stays set. When that
 * session later ends with a 401, RequireAccount forgets the page the player was on.
 * The other way round (Phase 2 review carry-over): a session check still on its way
 * when the player logs out answers for the ended session; setAccount cancels it, and
 * its late account must not clear the flag, or the next guest page is remembered.
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'

import { stubBrowserApis } from '@/test/fakeBackend'

const ACCOUNT = { uuid: 'u-1', username: 'steve_01', display_name: 'Steve_01', registered_at: '2026-01-01T00:00:00Z' }

beforeAll(stubBrowserApis)
afterEach(cleanup)

async function renderApp() {
  // The flag lives in queries.ts: every test gets fresh modules, as a fresh page load would.
  vi.resetModules()
  const { installFakeBackend } = await import('@/test/fakeBackend')
  const { queryClient } = await import('@/queryClient')
  const { GuestOnly, RequireAccount } = await import('@/features/auth/guards')
  const { useLogout } = await import('@/features/auth/queries')

  type Reply = { status: number; data: unknown }
  const backend = { me: { status: 200, data: { data: ACCOUNT } } as Reply | Promise<Reply> }
  const calls = installFakeBackend({
    'GET /auth/me': () => backend.me,
    'POST /auth/logout': () => ({ status: 204, data: '' }),
  })

  function LogoutButton() {
    const logout = useLogout()
    return <button onClick={() => logout.mutate()}>Kijelentkezés</button>
  }
  function LoginPage() {
    return (
      <>
        <p>LOGIN {JSON.stringify(useLocation().state)}</p>
        <Link to="/jatekosok">Oldal megnyitása</Link>
      </>
    )
  }

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/jatekosok']}>
        <Routes>
          <Route path="/" element={<RequireAccount><Link to="/jatekosok">Játékosok</Link></RequireAccount>} />
          <Route path="/jatekosok" element={<RequireAccount><p>JÁTÉKOSOK</p><LogoutButton /></RequireAccount>} />
          <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await screen.findByText('JÁTÉKOSOK')

  return {
    /** This tab asks /auth/me again (window focus after the 60 s staleTime) and gets this answer. */
    meAnswers: async (reply: { status: number; data: unknown }) => {
      backend.me = reply
      await act(() => queryClient.refetchQueries({ queryKey: ['account'] }))
    },
    /** This tab asks /auth/me again, and the answer waits until released. */
    meHangs: async () => {
      let release: (reply: Reply) => void = () => {}
      backend.me = new Promise<Reply>((resolve) => (release = resolve))
      const before = calls.filter((call) => call === 'GET /auth/me').length
      void queryClient.refetchQueries({ queryKey: ['account'] })
      await waitFor(() => expect(calls.filter((call) => call === 'GET /auth/me')).toHaveLength(before + 1))
      return async (reply: Reply) => {
        release(reply)
        await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
      }
    },
  }
}

const sessionGone = { status: 401, data: { message: 'Ehhez be kell jelentkezned.', code: 'unauthenticated' } }

it('repro: logged out here, in again in another tab: a later 401 on /jatekosok forgets the page', {
  timeout: 15_000,
}, async () => {
  const app = await renderApp()
  fireEvent.click(screen.getByRole('button', { name: 'Kijelentkezés' }))
  await screen.findByText(/^LOGIN/)

  // The other tab logged in on the same browser session; this tab notices on focus.
  await app.meAnswers({ status: 200, data: { data: ACCOUNT } })
  fireEvent.click(await screen.findByRole('link', { name: 'Játékosok' }))
  await screen.findByText('JÁTÉKOSOK')

  // The session ends (a password change on another device, two idle hours).
  await app.meAnswers(sessionGone)

  expect((await screen.findByText(/^LOGIN/)).textContent).toBe('LOGIN {"from":"/jatekosok"}')
})

it('control: without the earlier logout the same 401 keeps the page', { timeout: 15_000 }, async () => {
  const app = await renderApp()

  await app.meAnswers(sessionGone)

  expect((await screen.findByText(/^LOGIN/)).textContent).toBe('LOGIN {"from":"/jatekosok"}')
})

it('a session check cancelled by the logout does not clear the flag: the next guest page is not remembered', {
  timeout: 15_000,
}, async () => {
  const app = await renderApp()
  const answer = await app.meHangs()

  fireEvent.click(screen.getByRole('button', { name: 'Kijelentkezés' }))
  expect((await screen.findByText(/^LOGIN/)).textContent).toBe('LOGIN null')
  // The check sent before the logout answers late, still with the account of the ended session.
  await answer({ status: 200, data: { data: ACCOUNT } })

  // A guest opening a page after their own logout: nothing is remembered, the next login starts at home.
  fireEvent.click(screen.getByRole('link', { name: 'Oldal megnyitása' }))
  expect((await screen.findByText(/^LOGIN/)).textContent).toBe('LOGIN null')
})
