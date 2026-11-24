/**
 * Review 2026-11-24 AU-1: the login card treated every return to the history entry the reset left behind
 * (/login with router state {username}) as a fresh reset: Back to it closed the 2FA code step the
 * player had open and emptied the password, though no reset happened.
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

const notInert = (elements: HTMLElement[]) => elements.find((element) => element.closest('[inert]') === null)
const loginSlide = () => {
  const name = notInert(screen.queryAllByLabelText('Játékosnév'))
  return name ? within(name.closest('form')!) : null
}
const forgotPanel = () => within(screen.getByRole('region', { name: 'Elfelejtett jelszó' }))
const visibleTab = (label: string) => notInert(screen.getAllByRole('link', { name: label }))!

async function resetThenOpenCodeStep() {
  await renderApp()
  await waitFor(() => expect(screen.getByRole('region', { name: 'Elfelejtett jelszó' }).closest('[inert]')).toBeNull())
  fireEvent.change(forgotPanel().getByLabelText('E-mail cím'), { target: { value: 'steve@example.com' } })
  fireEvent.click(forgotPanel().getByRole('button', { name: 'Kód küldése' }))
  fireEvent.change(await forgotPanel().findByLabelText('Kód az e-mailből'), { target: { value: '123456' } })
  fireEvent.change(await forgotPanel().findByLabelText('Új jelszó'), { target: { value: 'uj-jelszo-2026' } })
  fireEvent.change(forgotPanel().getByLabelText('Új jelszó újra'), { target: { value: 'uj-jelszo-2026' } })
  fireEvent.click(forgotPanel().getByRole('button', { name: 'Jelszó mentése' }))
  // The reset's own entry: /login with the name filled in.
  await waitFor(() => expect((loginSlide()?.getByLabelText('Játékosnév') as HTMLInputElement | undefined)?.value).toBe('Steve_01'))

  // The player logs in with the new password: the 2FA code step opens.
  fireEvent.change(loginSlide()!.getByLabelText('Jelszó'), { target: { value: 'uj-jelszo-2026' } })
  fireEvent.click(loginSlide()!.getByRole('button', { name: 'Belépés' }))
  await screen.findByRole('heading', { name: 'Kétlépcsős azonosítás' })

  // A look at the registration tab.
  fireEvent.click(visibleTab('Regisztráció'))
  await waitFor(() => expect(window.location.pathname).toBe('/register'))
}

// The registration slide's tabs carry a "Belépés" link too: tests wait for the login card's title, the slide's own switch.
const codeStepOpen = () => notInert(screen.queryAllByRole('heading', { name: 'Kétlépcsős azonosítás' })) !== undefined

it('the browser Back from the registration tab keeps the open 2FA code step', { timeout: 15_000 }, async () => {
  await resetThenOpenCodeStep()

  // Back to the login: the same history entry the reset made.
  window.history.back()
  await waitFor(() => expect(window.location.pathname).toBe('/login'))
  await waitFor(() => expect(document.title).toBe('Belépés | RuneEmpire'))

  expect(codeStepOpen()).toBe(true)
})

it('control: the Belépés tab back from the registration keeps the open 2FA code step', { timeout: 15_000 }, async () => {
  await resetThenOpenCodeStep()

  fireEvent.click(visibleTab('Belépés'))
  await waitFor(() => expect(window.location.pathname).toBe('/login'))
  await waitFor(() => expect(document.title).toBe('Belépés | RuneEmpire'))

  expect(codeStepOpen()).toBe(true)
})
