/**
 * Frontend review 2026-11-13d (auth-register-path): the router opens the auth page for /register/ and
 * /Register too (a trailing slash and other case still match the route), but
 * AuthPage picks the form by an exact string compare, so the registration
 * link shows the login form.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { stubBrowserApis } from '@/test/fakeBackend'

// The logged-in frame and the overview are not on this path.
vi.mock('@/features/app/AppLayout', async () => {
  const { Outlet } = await import('react-router')
  return { AppLayout: () => <div>BELÉPVE<Outlet /></div> }
})
vi.mock('@/features/home/HomePage', () => ({ HomePage: () => <p>ÁTTEKINTÉS</p> }))

async function openAsGuest(path: string) {
  // App keeps the router, the query client and the axios client as module singletons.
  vi.resetModules()
  const { installFakeBackend } = await import('@/test/fakeBackend')
  installFakeBackend({ 'GET /auth/me': () => ({ status: 200, data: { data: null } }) })
  window.history.pushState({}, '', path)
  const { default: App } = await import('@/App')
  render(<App />)
  await screen.findByRole('button', { name: 'Kód küldése' })
}

/** The form the visitor can use: the other one waits off to the side, inert. */
function activeForm() {
  const registerSlide = screen.getByRole('button', { name: 'Kód küldése' }).closest('[inert]')
  const loginSlide = screen.getByRole('button', { name: 'Belépés' }).closest('[inert]')
  return { register: registerSlide === null, login: loginSlide === null, title: document.title }
}

describe('a registration link opens the registration form', { timeout: 15_000 }, () => {
  beforeAll(stubBrowserApis)
  afterEach(cleanup)

  it('control: /register', async () => {
    await openAsGuest('/register')
    expect(activeForm()).toEqual({ register: true, login: false, title: 'Regisztráció | RuneEmpire' })
  })

  it.each(['/register/', '/Register'])('%s (a shared link with a trailing slash or a capital)', async (path) => {
    await openAsGuest(path)
    expect(activeForm()).toEqual({ register: true, login: false, title: 'Regisztráció | RuneEmpire' })
  })
})
