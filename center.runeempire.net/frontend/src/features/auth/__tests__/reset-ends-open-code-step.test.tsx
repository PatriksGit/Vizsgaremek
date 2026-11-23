/**
 * Regression test (frontend review 2026-11-23).
 * AUTH-3: a reset sends a guest to /login with the name filled in
 * (router state {username}). If the login card was left on the 2FA code step
 * (the browser's Back from it to the forgotten password panel), the card
 * still shows that code step: no name, no password field.
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { toast } from 'sonner'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'

import { stubBrowserApis, type Handler, type Reply } from '@/test/fakeBackend'

vi.mock('@/features/app/AppLayout', async () => {
  const { Outlet } = await import('react-router')
  return { AppLayout: () => <div>BELÉPVE<Outlet /></div> }
})
vi.mock('@/features/home/HomePage', () => ({ HomePage: () => <p>FŐOLDAL</p> }))

beforeAll(stubBrowserApis)
afterEach(() => {
  toast.dismiss()
  cleanup()
})

function codeSent(email: string): Reply {
  const now = Date.now()
  return {
    status: 202,
    headers: { date: new Date(now).toUTCString() },
    data: {
      data: { email, expires_at: new Date(now + 15 * 60_000).toISOString(), resend_at: new Date(now + 600_000).toISOString() },
    },
  }
}

async function renderApp() {
  vi.resetModules()
  const { installFakeBackend } = await import('@/test/fakeBackend')
  const routes: Record<string, Handler> = {
    'GET /auth/me': () => ({ status: 200, data: { data: null } }),
    'POST /auth/login': () => ({ status: 202, data: { data: { two_factor_required: true } } }),
    'POST /auth/password/forgot': (config) => codeSent((JSON.parse(config.data as string) as { email: string }).email),
    'POST /auth/password/forgot/verify': () => ({ status: 200, data: { data: { two_factor_required: false } } }),
    'POST /auth/password/reset': () => ({ status: 200, data: { data: { username: 'Steve_01' } } }),
  }
  installFakeBackend(routes)
  window.history.pushState({}, '', '/forgot-password')
  const { default: App } = await import('@/App')
  render(<App />)
}

/** The login slide is the one that is not inert. */
const loginSlide = () => {
  const name = screen.getAllByLabelText('Játékosnév').find((input) => input.closest('[inert]') === null)
  return name ? within(name.closest('form')!) : null
}
/** The name field of the login slide, once it is on screen. */
const loginName = () => loginSlide()?.getByLabelText('Játékosnév') as HTMLInputElement | undefined
const forgotPanel = () => within(screen.getByRole('region', { name: 'Elfelejtett jelszó' }))

async function resetPassword() {
  await waitFor(() => expect(screen.getByRole('region', { name: 'Elfelejtett jelszó' }).closest('[inert]')).toBeNull())
  fireEvent.change(forgotPanel().getByLabelText('E-mail cím'), { target: { value: 'steve@example.com' } })
  fireEvent.click(forgotPanel().getByRole('button', { name: 'Kód küldése' }))
  fireEvent.change(await forgotPanel().findByLabelText('Kód az e-mailből'), { target: { value: '123456' } })
  fireEvent.change(await forgotPanel().findByLabelText('Új jelszó'), { target: { value: 'uj-jelszo-2026' } })
  fireEvent.change(forgotPanel().getByLabelText('Új jelszó újra'), { target: { value: 'uj-jelszo-2026' } })
  fireEvent.click(forgotPanel().getByRole('button', { name: 'Jelszó mentése' }))
  await waitFor(() => expect(window.location.pathname).toBe('/login'))
}

async function toLoginFromForgot() {
  await screen.findByRole('heading', { name: 'Elfelejtett jelszó' })
  fireEvent.click(screen.getByRole('link', { name: 'Vissza a belépéshez' }))
  await waitFor(() => expect(loginSlide()).not.toBeNull())
}

it('repro: Back from the 2FA code step to the panel, reset: the login card still asks for the code', {
  timeout: 15_000,
}, async () => {
  await renderApp()
  await toLoginFromForgot()
  fireEvent.change(loginSlide()!.getByLabelText('Játékosnév'), { target: { value: 'Steve_01' } })
  fireEvent.change(loginSlide()!.getByLabelText('Jelszó'), { target: { value: 'regi-jelszo' } })
  fireEvent.click(loginSlide()!.getByRole('button', { name: 'Belépés' }))
  await screen.findByRole('heading', { name: 'Kétlépcsős azonosítás' })

  // "I'd better reset it after all": the browser's Back button.
  window.history.back()
  await resetPassword()

  await waitFor(() => expect(loginName()?.value).toBe('Steve_01'))
})

it('control: from the password step, reset: the login card has the name filled in', { timeout: 15_000 }, async () => {
  await renderApp()
  await toLoginFromForgot()

  window.history.back()
  await resetPassword()

  await waitFor(() => expect(loginName()?.value).toBe('Steve_01'))
})
