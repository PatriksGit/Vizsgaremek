/**
 * Frontend review 2026-11-13d (auth-late-401): queryClient.ts forgets the account on ANY 401, also on a
 * request the previous session sent. A player switches accounts on a slow
 * backend: the overview's stats request is still on its way when they log out
 * and log in as someone else; it then answers 401 for the ended session, and
 * the new, valid login is thrown back to the login page.
 *
 * Control, run by hand (REPRO_CONTROL=1): the same old request answers before the new login.
 * One case per run: the HomePage stand-in imports the real stats module, which
 * vi.resetModules() would not give a fresh axios client in a second case.
 */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { installFakeBackend, stubBrowserApis, type Reply } from '@/test/fakeBackend'

const CONTROL = import.meta.env.REPRO_CONTROL === '1'

// The frame is not on this path; the overview keeps only its real stats query and a link to the settings.
vi.mock('@/features/app/AppLayout', async () => {
  const { Outlet } = await import('react-router')
  return { AppLayout: () => <Outlet /> }
})
vi.mock('@/features/home/HomePage', async () => {
  const { Link } = await import('react-router')
  const { useMyStats } = await import('@/features/home/stats')
  return {
    HomePage: () => {
      useMyStats()
      return (
        <p>
          ÁTTEKINTÉS <Link to="/beallitasok">Beállítások</Link>
        </p>
      )
    },
  }
})

const A = { uuid: 'u-a', username: 'steve_01', display_name: 'Steve_01', registered_at: '2026-01-01T00:00:00Z' }
const B = { uuid: 'u-b', username: 'alex_02', display_name: 'Alex_02', registered_at: '2026-01-01T00:00:00Z' }

let statsCalls = 0
let releaseFirstStats: ((reply: Reply) => void) | undefined

function backend() {
  installFakeBackend({
    'GET /auth/me': () => ({ status: 200, data: { data: A } }),
    // A's first stats request is slow: the server is still on it.
    'GET /me/stats': () =>
      statsCalls++ === 0
        ? new Promise<Reply>((resolve) => (releaseFirstStats = resolve))
        : { status: 200, data: { data: {} } },
    'GET /discord-widget': () => ({ status: 503, data: { message: 'A Discord most nem elérhető.' } }),
    'POST /auth/logout': () => ({ status: 204 }),
    'POST /auth/login': () => ({ status: 200, data: { data: B } }),
  })
}

/** The server handled A's slow request after the logout: that session is gone. */
const answerOldStatsWith401 = () =>
  act(async () => releaseFirstStats!({ status: 401, data: { message: 'Ehhez be kell jelentkezned.' } }))

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 300)))

async function logOutFromTheSettings() {
  fireEvent.click(await screen.findByRole('link', { name: 'Beállítások' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Kijelentkezés' }))
  await screen.findAllByRole('button', { name: 'Belépés' })
}

async function logInAsB() {
  const loginForm = (await screen.findAllByRole('button', { name: 'Belépés' }))[0].closest('form')!
  fireEvent.change(within(loginForm).getByLabelText('Játékosnév'), { target: { value: 'Alex_02' } })
  fireEvent.change(within(loginForm).getByLabelText('Jelszó'), { target: { value: 'jelszo-2026' } })
  fireEvent.click(within(loginForm).getByRole('button', { name: 'Belépés' }))
  await screen.findByText(/ÁTTEKINTÉS/)
}

describe('switching accounts while an old request is still on its way', { timeout: 15_000 }, () => {
  beforeAll(stubBrowserApis)
  afterEach(cleanup)

  it(CONTROL ? 'control: the old request answers before the new login' : 'the old request answers 401 after B logged in', async () => {
    backend()
    window.history.pushState({}, '', '/')
    const { default: App } = await import('@/App')
    render(<App />)
    await screen.findByText(/ÁTTEKINTÉS/)
    expect(releaseFirstStats).toBeDefined()

    await logOutFromTheSettings()
    if (CONTROL) await answerOldStatsWith401()
    await logInAsB()
    if (!CONTROL) await answerOldStatsWith401()
    await settle()

    expect(window.location.pathname).toBe('/')
    expect(screen.queryByText(/ÁTTEKINTÉS/)).not.toBeNull()
  })
})
