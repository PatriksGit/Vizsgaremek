import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { stubBrowserApis, type Reply } from '@/test/fakeBackend'

// The logged-in frame and the overview are not on this path: stand-ins keep jsdom away from charts and WebGL.
vi.mock('@/features/app/AppLayout', async () => {
  const { Outlet } = await import('react-router')
  return { AppLayout: () => <div>BELÉPVE<Outlet /></div> }
})
vi.mock('@/features/home/HomePage', () => ({ HomePage: () => <p>ÁTTEKINTÉS</p> }))

const ACCOUNT = { uuid: 'u-1', username: 'steve_01', display_name: 'Steve_01', registered_at: '2026-01-01T00:00:00Z' }

type Release = (reply: Reply) => void

/**
 * The fake backend. GET /auth/me answers a guest at once on page load; when
 * `holdNextMe` is set, the next /auth/me is held until the test releases it,
 * like a request the server is still working on.
 */
async function authBackend(options: { holdNextMe: boolean }) {
  // App holds the query client, the router and the axios client as module
  // singletons: a fresh copy per test, and the fake goes on that copy's client.
  vi.resetModules()
  const { installFakeBackend } = await import('@/test/fakeBackend')
  let meCalls = 0
  let releaseMe: Release | undefined
  installFakeBackend({
    'GET /auth/me': () => {
      meCalls++
      if (meCalls === 1 || !options.holdNextMe) return { status: 200, data: { data: null } }
      return new Promise<Reply>((resolve) => (releaseMe = resolve))
    },
    'POST /auth/login': () => ({ status: 200, data: { data: ACCOUNT } }),
  })
  return {
    meCalls: () => meCalls,
    release: (reply: Reply) => releaseMe?.(reply),
  }
}

async function renderAppAt(path: string) {
  window.history.pushState({}, '', path)
  const { default: App } = await import('@/App')
  render(<App />)
}

async function logIn() {
  const loginForm = (await screen.findAllByRole('button', { name: 'Belépés' }))[0].closest('form')!
  fireEvent.change(within(loginForm).getByLabelText('Játékosnév'), { target: { value: 'Steve_01' } })
  fireEvent.change(within(loginForm).getByLabelText('Jelszó'), { target: { value: 'jelszo-2026' } })
  fireEvent.click(within(loginForm).getByRole('button', { name: 'Belépés' }))
  await screen.findByText('ÁTTEKINTÉS')
}

/** The player was on the login page for over a minute (staleTime 60 s) and comes back to the tab. */
async function comeBackToTheTabAfterAMinute() {
  vi.setSystemTime(Date.now() + 61_000)
  await act(async () => {
    window.dispatchEvent(new Event('visibilitychange'))
  })
}

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 200)))

describe('logging in while the session check is still on its way', () => {
  beforeAll(stubBrowserApis)
  beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: Date.now() }))
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('a login with no session check in flight stays logged in', async () => {
    const backend = await authBackend({ holdNextMe: false })
    await renderAppAt('/login')
    await logIn()
    await settle()

    expect(window.location.pathname).toBe('/')
    expect(screen.queryByText('ÁTTEKINTÉS')).not.toBeNull()
    expect(backend.meCalls()).toBe(1)
  })

  it('a login that succeeds while a /auth/me sent before it is still pending stays logged in', async () => {
    const backend = await authBackend({ holdNextMe: true })
    await renderAppAt('/login')
    await screen.findAllByRole('button', { name: 'Belépés' })

    await comeBackToTheTabAfterAMinute()
    expect(backend.meCalls()).toBe(2)

    // The password goes in and the login succeeds before that check answers...
    await logIn()
    // ...which then answers what the server saw when it was sent: a guest.
    await act(async () => backend.release({ status: 200, data: { data: null } }))
    await settle()

    expect(window.location.pathname).toBe('/')
    expect(screen.queryByText('ÁTTEKINTÉS')).not.toBeNull()
  })
})
