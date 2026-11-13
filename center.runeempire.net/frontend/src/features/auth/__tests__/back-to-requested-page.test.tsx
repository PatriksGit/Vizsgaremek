/**
 * After logging in, the player lands on the page they asked for (owner,
 * 2026-11-13, frontend review 2026-11-13d question 1): a link to /rangok
 * opened while logged out, or a session that ran out on a subpage, comes back
 * to that page, not to the home page. Opening the login page itself still
 * leads home.
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { stubBrowserApis } from '@/test/fakeBackend'

// The logged-in frame and the overview are not on this path: stand-ins keep jsdom away from charts and WebGL.
vi.mock('@/features/app/AppLayout', async () => {
  const { Outlet } = await import('react-router')
  return { AppLayout: () => <Outlet /> }
})
vi.mock('@/features/home/HomePage', () => ({ HomePage: () => <p>FŐOLDAL</p> }))

const ACCOUNT = { uuid: 'u-1', username: 'steve_01', display_name: 'Steve_01', registered_at: '2026-01-01T00:00:00Z' }

async function openAsGuest(path: string) {
  // App keeps the router, the query client and the axios client as module singletons.
  vi.resetModules()
  const { installFakeBackend } = await import('@/test/fakeBackend')
  installFakeBackend({
    'GET /auth/me': () => ({ status: 200, data: { data: null } }),
    'POST /auth/login': () => ({ status: 200, data: { data: ACCOUNT } }),
  })
  window.history.pushState({}, '', path)
  const { default: App } = await import('@/App')
  render(<App />)
}

async function logIn() {
  const loginForm = (await screen.findAllByRole('button', { name: 'Belépés' }))[0].closest('form')!
  fireEvent.change(within(loginForm).getByLabelText('Játékosnév'), { target: { value: 'Steve_01' } })
  fireEvent.change(within(loginForm).getByLabelText('Jelszó'), { target: { value: 'jelszo-2026' } })
  fireEvent.click(within(loginForm).getByRole('button', { name: 'Belépés' }))
}

// The whole app renders here: under the full parallel suite that can pass 5 s.
describe('where the player lands after logging in', { timeout: 15_000 }, () => {
  beforeAll(stubBrowserApis)
  afterEach(cleanup)

  it('a page opened while logged out is shown after the login', async () => {
    await openAsGuest('/rangok')
    await logIn()

    await screen.findByText('Ez az oldal hamarosan elkészül.')
    expect(window.location.pathname).toBe('/rangok')
  })

  it('logging out on a page and in again leads home, not back to that page', async () => {
    vi.resetModules()
    const { installFakeBackend } = await import('@/test/fakeBackend')
    let loggedIn = true
    installFakeBackend({
      'GET /auth/me': () => ({ status: 200, data: { data: loggedIn ? ACCOUNT : null } }),
      'POST /auth/logout': () => {
        loggedIn = false
        return { status: 204, data: '' }
      },
      'POST /auth/login': () => {
        loggedIn = true
        return { status: 200, data: { data: ACCOUNT } }
      },
    })
    window.history.pushState({}, '', '/beallitasok')
    const { default: App } = await import('@/App')
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: 'Kijelentkezés' }))
    await logIn()

    await screen.findByText('FŐOLDAL')
    expect(window.location.pathname).toBe('/')
  })

  it('the login page opened directly leads home', async () => {
    await openAsGuest('/login')
    await logIn()

    await screen.findByText('FŐOLDAL')
    expect(window.location.pathname).toBe('/')
  })
})
