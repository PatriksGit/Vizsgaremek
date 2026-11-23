/**
 * Frontend review 2026-11-23 auth K2: the page a guest asked for (RequireAccount's router state
 * {from}) is kept when they switch to the Regisztráció tab or the forgotten password panel and
 * back, so the account made there, or the login after a reset, still leads to that page.
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { toast } from 'sonner'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { stubBrowserApis, type Handler } from '@/test/fakeBackend'

// The logged-in frame and the overview are not on this path: stand-ins keep jsdom away from charts and WebGL.
vi.mock('@/features/app/AppLayout', async () => {
  const { Outlet } = await import('react-router')
  return { AppLayout: () => <Outlet /> }
})
vi.mock('@/features/home/HomePage', () => ({ HomePage: () => <p>FŐOLDAL</p> }))

const ACCOUNT = { uuid: 'u-1', username: 'steve_01', display_name: 'Steve_01', registered_at: '2026-01-01T00:00:00Z' }

function codeSent(email: string) {
  const now = Date.now()
  return {
    status: 202,
    headers: { date: new Date(now).toUTCString() },
    data: {
      data: { email, expires_at: new Date(now + 15 * 60_000).toISOString(), resend_at: new Date(now + 600_000).toISOString() },
    },
  }
}

async function openAsGuest(path: string) {
  // App keeps the router, the query client and the axios client as module singletons.
  vi.resetModules()
  const { installFakeBackend } = await import('@/test/fakeBackend')
  const routes: Record<string, Handler> = {
    'GET /auth/me': () => ({ status: 200, data: { data: null } }),
    'POST /auth/login': () => ({ status: 200, data: { data: ACCOUNT } }),
    'POST /auth/register': () => codeSent('steve@example.com'),
    'POST /auth/register/verify': () => ({ status: 201, data: { data: ACCOUNT } }),
    'POST /auth/password/forgot': () => codeSent('steve@example.com'),
    'POST /auth/password/forgot/verify': () => ({ status: 200, data: { data: { two_factor_required: false } } }),
    'POST /auth/password/reset': () => ({ status: 200, data: { data: { username: 'Steve_01' } } }),
  }
  installFakeBackend(routes)
  window.history.pushState({}, '', path)
  const { default: App } = await import('@/App')
  render(<App />)
  // RequireAccount sent the guest to the login, remembering the page.
  await waitFor(() => expect(window.location.pathname).toBe('/login'))
}

/** The slide on screen: the others wait inert beside it. */
async function slide() {
  const active = await waitFor(() => {
    const found = [...document.querySelectorAll('form')].find((form) => form.closest('[inert]') === null)
    expect(found).toBeTruthy()
    return found!.closest('.col-start-1')! as HTMLElement
  })
  return within(active)
}

async function logIn() {
  // The login slide once it is the one on screen (right after a navigation the panel may still be).
  const name = await waitFor(() => {
    const onScreen = (field: HTMLElement) => field.closest('[inert]') === null
    const inLogin = (field: HTMLElement) => field.closest('form')?.querySelector('[type="submit"]')?.textContent === 'Belépés'
    const input = screen.getAllByLabelText('Játékosnév').find((field) => onScreen(field) && inLogin(field))
    expect(input).toBeTruthy()
    return input!
  })
  const login = within(name.closest('form')!)
  fireEvent.change(name, { target: { value: 'Steve_01' } })
  fireEvent.change(login.getByLabelText('Jelszó'), { target: { value: 'jelszo-2026' } })
  fireEvent.click(login.getByRole('button', { name: 'Belépés' }))
}

const landedOnRequestedPage = async () => {
  await screen.findByRole('heading', { name: 'Játékosok' })
  expect(window.location.pathname).toBe('/jatekosok')
}

describe('the requested page across the login card', { timeout: 15_000 }, () => {
  beforeAll(stubBrowserApis)
  afterEach(() => {
    toast.dismiss()
    cleanup()
  })

  it('a registration started from the Regisztráció tab leads to the requested page', async () => {
    await openAsGuest('/jatekosok')
    fireEvent.click((await slide()).getByRole('link', { name: 'Regisztráció' }))
    await waitFor(() => expect(window.location.pathname).toBe('/register'))

    const register = await slide()
    fireEvent.change(register.getByLabelText('Játékosnév'), { target: { value: 'Steve_01' } })
    fireEvent.change(register.getByLabelText('E-mail cím'), { target: { value: 'steve@example.com' } })
    fireEvent.change(register.getByLabelText('Jelszó'), { target: { value: 'jelszo-2026' } })
    fireEvent.change(register.getByLabelText('Jelszó újra'), { target: { value: 'jelszo-2026' } })
    for (const box of register.getAllByRole('checkbox')) fireEvent.click(box)
    fireEvent.click(register.getByRole('button', { name: 'Kód küldése' }))
    // The last digit sends the code (auth K1).
    fireEvent.change(await register.findByLabelText('Megerősítő kód'), { target: { value: '123456' } })

    await landedOnRequestedPage()
  })

  it('to the forgotten password panel and back, the login leads to the requested page', async () => {
    await openAsGuest('/jatekosok')
    fireEvent.click((await slide()).getByRole('link', { name: 'Elfelejtetted a jelszavad?' }))
    await waitFor(() => expect(window.location.pathname).toBe('/forgot-password'))
    fireEvent.click((await slide()).getByRole('link', { name: 'Vissza a belépéshez' }))
    await waitFor(() => expect(window.location.pathname).toBe('/login'))

    await logIn()

    await landedOnRequestedPage()
  })

  it('after a reset, the login leads to the requested page', async () => {
    await openAsGuest('/jatekosok')
    fireEvent.click((await slide()).getByRole('link', { name: 'Elfelejtetted a jelszavad?' }))
    await waitFor(() => expect(window.location.pathname).toBe('/forgot-password'))

    const panel = await slide()
    fireEvent.change(panel.getByLabelText('E-mail cím'), { target: { value: 'steve@example.com' } })
    fireEvent.click(panel.getByRole('button', { name: 'Kód küldése' }))
    fireEvent.change(await panel.findByLabelText('Kód az e-mailből'), { target: { value: '123456' } })
    fireEvent.change(await panel.findByLabelText('Új jelszó'), { target: { value: 'uj-jelszo-2026' } })
    fireEvent.change(panel.getByLabelText('Új jelszó újra'), { target: { value: 'uj-jelszo-2026' } })
    fireEvent.click(panel.getByRole('button', { name: 'Jelszó mentése' }))
    await waitFor(() => expect(window.location.pathname).toBe('/login'))

    await logIn()

    await landedOnRequestedPage()
  })
})
