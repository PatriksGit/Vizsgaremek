/**
 * Review 2026-11-24 AU-2: the forgotten password panel's "Jelszó mentése" kept its navigate for an answer that
 * arrives after the player left the panel: a logged-in player who saved the new password of another
 * account and went "Vissza" to Beállítások was pulled to the home page when the slow answer comes.
 */
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { toast } from 'sonner'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'

import { stubBrowserApis, type Handler, type Reply } from '@/test/fakeBackend'

vi.mock('@/features/app/AppLayout', async () => {
  const { Outlet } = await import('react-router')
  return { AppLayout: () => <div>BELÉPVE<Outlet /></div> }
})
vi.mock('@/features/home/HomePage', () => ({ HomePage: () => <p>FŐOLDAL</p> }))
vi.mock('@/features/account/AccountPage', () => ({ AccountPage: () => <p>BEÁLLÍTÁSOK</p> }))

beforeAll(stubBrowserApis)
afterEach(() => {
  toast.dismiss()
  cleanup()
})

const ME = {
  uuid: '00000000-0000-3000-8000-000000000001',
  username: 'alex_02',
  display_name: 'Alex_02',
  email: 'alex@example.com',
  two_factor_enabled: false,
  can_manage: false,
  registered_at: '2026-01-01T00:00:00Z',
}

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
  let answerReset: ((reply: Reply) => void) | null = null
  const routes: Record<string, Handler> = {
    'GET /auth/me': () => ({ status: 200, data: { data: ME } }),
    'POST /auth/password/forgot': (config) => codeSent((JSON.parse(config.data as string) as { email: string }).email),
    'POST /auth/password/forgot/verify': () => ({ status: 200, data: { data: { two_factor_required: false } } }),
    // A slow backend: the answer comes when the test says so.
    'POST /auth/password/reset': () => new Promise<Reply>((resolve) => (answerReset = resolve)),
  }
  installFakeBackend(routes)
  window.history.pushState({}, '', '/forgot-password')
  const { default: App } = await import('@/App')
  render(<App />)
  return {
    resetSent: () => waitFor(() => expect(answerReset).not.toBeNull()),
    answerReset: () => act(async () => answerReset?.({ status: 200, data: { data: { username: 'Steve_01' } } })),
  }
}

const forgotPanel = () => within(screen.getByRole('region', { name: 'Elfelejtett jelszó' }))

/** Logged in as Alex_02, the player resets the password of their other account, Steve_01. */
async function saveNewPassword() {
  const backend = await renderApp()
  await waitFor(() => expect(screen.getByRole('region', { name: 'Elfelejtett jelszó' }).closest('[inert]')).toBeNull())
  fireEvent.change(forgotPanel().getByLabelText('E-mail cím'), { target: { value: 'steve@example.com' } })
  fireEvent.click(forgotPanel().getByRole('button', { name: 'Kód küldése' }))
  fireEvent.change(await forgotPanel().findByLabelText('Kód az e-mailből'), { target: { value: '123456' } })
  fireEvent.change(await forgotPanel().findByLabelText('Új jelszó'), { target: { value: 'uj-jelszo-2026' } })
  fireEvent.change(forgotPanel().getByLabelText('Új jelszó újra'), { target: { value: 'uj-jelszo-2026' } })
  fireEvent.click(forgotPanel().getByRole('button', { name: 'Jelszó mentése' }))
  await backend.resetSent()
  return backend
}

it('left for Beállítások while the new password was saved, the late answer keeps the player there', { timeout: 15_000 }, async () => {
  const backend = await saveNewPassword()

  fireEvent.click(screen.getByRole('link', { name: 'Vissza' }))
  await screen.findByText('BEÁLLÍTÁSOK')
  await backend.answerReset()
  await act(() => new Promise((resolve) => setTimeout(resolve, 50)))

  expect(window.location.pathname).toBe('/beallitasok')
})

it('control: still on the panel when the answer comes, the player goes home', { timeout: 15_000 }, async () => {
  const backend = await saveNewPassword()

  await backend.answerReset()

  await waitFor(() => expect(window.location.pathname).toBe('/'))
})
