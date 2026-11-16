/**
 * The forgotten password panel has its own address on the login card, and a
 * logged-in visitor may open it too: the settings page will link here for a
 * forgotten current password.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { stubBrowserApis } from '@/test/fakeBackend'

// The logged-in frame and the overview are not on this path.
vi.mock('@/features/app/AppLayout', async () => {
  const { Outlet } = await import('react-router')
  return { AppLayout: () => <div>BELÉPVE<Outlet /></div> }
})
vi.mock('@/features/home/HomePage', () => ({ HomePage: () => <p>FŐOLDAL</p> }))

const ACCOUNT = { uuid: 'u-1', username: 'steve_01', display_name: 'Steve_01', registered_at: '2026-01-01T00:00:00Z' }

async function open(path: string, account: typeof ACCOUNT | null = null) {
  // App keeps the router, the query client and the axios client as module singletons.
  vi.resetModules()
  const { installFakeBackend } = await import('@/test/fakeBackend')
  installFakeBackend({ 'GET /auth/me': () => ({ status: 200, data: { data: account } }) })
  window.history.pushState({}, '', path)
  const { default: App } = await import('@/App')
  render(<App />)
}

/** The forgot panel is the one the visitor can use (the others wait off to the side, inert). */
async function forgotPanelIsActive() {
  const heading = await screen.findByRole('heading', { name: 'Elfelejtett jelszó' })
  return heading.closest('[inert]') === null
}

describe('the forgotten password address', { timeout: 15_000 }, () => {
  beforeAll(stubBrowserApis)
  afterEach(cleanup)

  it('opens the panel for a guest, with its title and a way back to the login', async () => {
    await open('/forgot-password')

    expect(await forgotPanelIsActive()).toBe(true)
    expect(document.title).toBe('Elfelejtett jelszó | RuneEmpire')
    expect(screen.getByRole('link', { name: '← Vissza a belépéshez' }).getAttribute('href')).toBe('/login')
  })

  it('the login card\'s link opens it', async () => {
    await open('/login')
    fireEvent.click(await screen.findByRole('link', { name: 'Elfelejtetted a jelszavad?' }))

    expect(await forgotPanelIsActive()).toBe(true)
  })

  it('a shared link with a trailing slash or capitals opens it too', async () => {
    await open('/Forgot-Password/')

    expect(await forgotPanelIsActive()).toBe(true)
  })

  it('a logged-in visitor is not sent away, and goes back to the settings', async () => {
    await open('/forgot-password', ACCOUNT)

    expect(await forgotPanelIsActive()).toBe(true)
    expect(screen.getByRole('link', { name: '← Vissza' }).getAttribute('href')).toBe('/beallitasok')
  })

  it('control: a logged-in visitor on the login page is still sent on', async () => {
    await open('/login', ACCOUNT)

    expect(await screen.findByText('FŐOLDAL')).toBeTruthy()
  })
})
