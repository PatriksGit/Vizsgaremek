/**
 * The forgotten password panel against a fake backend: e-mail → code → new
 * password, and every way it must not strand the player or waste a guess
 * (each wrong code costs one of 5 per code and 10 per day).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { toast } from 'sonner'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { Toaster } from '@/components/ui/sonner'
import { ForgotPasswordForm } from '@/features/auth/ForgotPasswordForm'
import { installFakeBackend, stubBrowserApis, type Handler, type Reply } from '@/test/fakeBackend'

// The whole-app tests at the end: the logged-in frame and the overview are not on this path.
vi.mock('@/features/app/AppLayout', async () => {
  const { Outlet } = await import('react-router')
  return { AppLayout: () => <div>BELÉPVE<Outlet /></div> }
})
vi.mock('@/features/home/HomePage', () => ({ HomePage: () => <p>FŐOLDAL</p> }))

const RIGHT_CODE = '123456'
const COOLDOWN = 'Erre az e-mail címre nemrég küldtünk kódot, próbáld újra kicsit később.'
const EXPIRED = 'A jelszó-visszaállítás lejárt, kérj új kódot.'

/** A 202 like the backend's, its times on the server clock given by the Date header. */
function codeSent(email: string, resendInSeconds = 600): Reply {
  const now = Date.now()
  return {
    status: 202,
    headers: { date: new Date(now).toUTCString() },
    data: {
      data: { email, expires_at: new Date(now + 15 * 60_000).toISOString(), resend_at: new Date(now + resendInSeconds * 1000).toISOString() },
    },
  }
}

function verify(config: Parameters<Handler>[0]): Reply {
  const { code } = JSON.parse(config.data as string) as { code: string }
  if (code === RIGHT_CODE) return { status: 204 }
  return { status: 422, data: { message: 'A kód érvénytelen vagy lejárt.', code: 'validation_failed', errors: { code: ['A kód érvénytelen vagy lejárt.'] } } }
}

/** The usual backend; any route can be swapped. Returns the request log. */
function backend(routes: Record<string, Handler> = {}) {
  return installFakeBackend({
    'POST /auth/password/forgot': (config) => codeSent((JSON.parse(config.data as string) as { email: string }).email),
    'POST /auth/password/forgot/verify': verify,
    'POST /auth/password/reset': () => ({ status: 200, data: { data: { username: 'Steve_01' } } }),
    'GET /auth/me': () => ({ status: 200, data: { data: null } }),
    ...routes,
  })
}

function renderPanel() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/elfelejtett-jelszo']}>
        <ForgotPasswordForm />
        <Toaster />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const count = (calls: string[], key: string) => calls.filter((call) => call === key).length

/** The panel itself: in the whole app the registration form has an "E-mail cím" too. */
const panel = () => within(screen.getByRole('region', { name: 'Elfelejtett jelszó' }))

async function sendEmail(email = 'steve@example.com') {
  fireEvent.change(panel().getByLabelText('E-mail cím'), { target: { value: email } })
  fireEvent.click(panel().getByRole('button', { name: 'Kód küldése' }))
  return panel().findByLabelText('Kód az e-mailből')
}

async function typeCode(code: string) {
  fireEvent.change(screen.getByLabelText('Kód az e-mailből'), { target: { value: code } })
}

describe('the forgotten password panel', { timeout: 15_000 }, () => {
  beforeAll(stubBrowserApis)
  // Sonner keeps active toasts globally and replays them to the next Toaster.
  afterEach(() => {
    toast.dismiss()
    cleanup()
  })

  it('e-mail → code → new password, then the account is logged out and the toast says so', async () => {
    const calls = backend()
    renderPanel()
    await sendEmail()
    expect(screen.getByText(/steve@example\.com/)).toBeTruthy()

    await typeCode(RIGHT_CODE)
    fireEvent.change(await screen.findByLabelText('Új jelszó'), { target: { value: 'uj-jelszo-2026' } })
    fireEvent.change(screen.getByLabelText('Új jelszó újra'), { target: { value: 'uj-jelszo-2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Jelszó mentése' }))

    expect(await screen.findByText('Megváltozott a jelszavad, most már beléphetsz.')).toBeTruthy()
    expect(count(calls, 'POST /auth/password/reset')).toBe(1)
  })

  it('a wrong code clears the field and says why', async () => {
    backend()
    renderPanel()
    await sendEmail()

    await typeCode('654321')

    expect(await screen.findByText('A kód érvénytelen vagy lejárt.')).toBeTruthy()
    expect((screen.getByLabelText('Kód az e-mailből') as HTMLInputElement).value).toBe('')
    expect(screen.queryByLabelText('Új jelszó')).toBeNull()
  })

  it('the last digit sends the code by itself, and Enter on top of it sends nothing more', async () => {
    let release: () => void = () => {}
    const calls = backend({
      'POST /auth/password/forgot/verify': (config) => new Promise<Reply>((resolve) => (release = () => resolve(verify(config)))),
    })
    renderPanel()
    await sendEmail()

    await typeCode('654321')
    // The last digit already sent it: Enter and the button while it is on its way.
    await waitFor(() => expect(count(calls, 'POST /auth/password/forgot/verify')).toBe(1))
    fireEvent.click(screen.getByRole('button', { name: /Kód ellenőrzése/ }))
    fireEvent.submit(screen.getByLabelText('Kód az e-mailből').closest('form')!)
    release()

    await screen.findByText('A kód érvénytelen vagy lejárt.')
    expect(count(calls, 'POST /auth/password/forgot/verify')).toBe(1)
  })

  it('"Módosítás" and the same address while its code works: back to the code, no new mail', async () => {
    const calls = backend()
    renderPanel()
    await sendEmail()

    fireEvent.click(screen.getByRole('button', { name: 'Módosítás' }))
    fireEvent.click(screen.getByRole('button', { name: 'Kód küldése' }))

    expect(await screen.findByLabelText('Kód az e-mailből')).toBeTruthy()
    expect(count(calls, 'POST /auth/password/forgot')).toBe(1)
  })

  it('"Módosítás" and another address asks for a new code', async () => {
    const calls = backend()
    renderPanel()
    await sendEmail()

    fireEvent.click(screen.getByRole('button', { name: 'Módosítás' }))
    await sendEmail('alex@example.com')

    expect(count(calls, 'POST /auth/password/forgot')).toBe(2)
  })

  it('after a reload the cooldown offers to type the code that is already in the mailbox', async () => {
    backend({
      'POST /auth/password/forgot': () => ({
        status: 429,
        headers: { 'retry-after': '480' },
        data: { message: COOLDOWN, code: 'auth.code_recently_sent', details: { resend_at: new Date(Date.now() + 480_000).toISOString() } },
      }),
    })
    renderPanel()
    fireEvent.change(screen.getByLabelText('E-mail cím'), { target: { value: 'steve@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Kód küldése' }))
    await screen.findByText(COOLDOWN)

    fireEvent.click(screen.getByRole('button', { name: 'Írd be' }))

    expect(await screen.findByLabelText('Kód az e-mailből')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Újraküldés 4(80|79) mp múlva/ })).toBeTruthy()
  })

  it.each([
    ['too_many_requests', 'Túl sok próbálkozás. Próbáld újra 1 perc múlva.'],
    ['auth.reset_guesses_spent', 'Túl sok hibás kódpróbálkozás volt ezzel a címmel. Próbáld újra holnap, vagy írj nekünk Discordon.'],
  ])('%s does not offer the code step', async (code, message) => {
    backend({ 'POST /auth/password/forgot': () => ({ status: 429, headers: { 'retry-after': '60' }, data: { message, code } }) })
    renderPanel()
    fireEvent.change(screen.getByLabelText('E-mail cím'), { target: { value: 'steve@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Kód küldése' }))

    expect(await screen.findByText(message)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Írd be' })).toBeNull()
  })

  it('counts down to the resend, then offers it', async () => {
    backend({ 'POST /auth/password/forgot': (config) => codeSent((JSON.parse(config.data as string) as { email: string }).email, 2) })
    renderPanel()
    await sendEmail()

    // The Date header has whole seconds, so the count may start one higher.
    expect(screen.getByRole('button', { name: /Újraküldés [23] mp múlva/ })).toBeTruthy()
    expect(await screen.findByRole('button', { name: 'Kód újraküldése' }, { timeout: 4_000 })).toBeTruthy()
  })

  it('"Kód újraküldése" mails one new code, clears the field and says the old one is gone', async () => {
    const calls = backend({ 'POST /auth/password/forgot': (config) => codeSent((JSON.parse(config.data as string) as { email: string }).email, -2) })
    renderPanel()
    await sendEmail()
    await typeCode('654321')
    await screen.findByText('A kód érvénytelen vagy lejárt.')
    await typeCode('12')

    fireEvent.click(await screen.findByRole('button', { name: 'Kód újraküldése' }))

    expect(await screen.findByText('Új kódot küldtünk. A korábbi kód már nem érvényes.')).toBeTruthy()
    expect((screen.getByLabelText('Kód az e-mailből') as HTMLInputElement).value).toBe('')
    expect(count(calls, 'POST /auth/password/forgot')).toBe(2)
  })

  it('"Kód újraküldése" waits while a code is being checked', async () => {
    let release: () => void = () => {}
    const calls = backend({
      'POST /auth/password/forgot': (config) => codeSent((JSON.parse(config.data as string) as { email: string }).email, -2),
      'POST /auth/password/forgot/verify': (config) => new Promise<Reply>((resolve) => (release = () => resolve(verify(config)))),
    })
    renderPanel()
    await sendEmail()
    await typeCode('654321')
    await waitFor(() => expect(count(calls, 'POST /auth/password/forgot/verify')).toBe(1))

    expect((screen.getByRole('button', { name: 'Kód újraküldése' }) as HTMLButtonElement).disabled).toBe(true)
    release()
    await screen.findByText('A kód érvénytelen vagy lejárt.')
  })

  it('an expired permission goes back to the e-mail with the reason', async () => {
    backend({
      'POST /auth/password/reset': () => ({ status: 422, data: { message: EXPIRED, code: 'auth.reset_expired', errors: { reset: [EXPIRED] } } }),
    })
    renderPanel()
    await sendEmail()
    await typeCode(RIGHT_CODE)
    fireEvent.change(await screen.findByLabelText('Új jelszó'), { target: { value: 'uj-jelszo-2026' } })
    fireEvent.change(screen.getByLabelText('Új jelszó újra'), { target: { value: 'uj-jelszo-2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Jelszó mentése' }))

    expect(await screen.findByText(EXPIRED)).toBeTruthy()
    expect((screen.getByLabelText('E-mail cím') as HTMLInputElement).readOnly).toBe(false)
    expect(screen.queryByLabelText('Kód az e-mailből')).toBeNull()
  })

  it('a double click, or Enter while saving, saves once', async () => {
    let release: () => void = () => {}
    const calls = backend({
      'POST /auth/password/reset': () => new Promise<Reply>((resolve) => (release = () => resolve({ status: 200, data: { data: { username: 'Steve_01' } } }))),
    })
    renderPanel()
    await sendEmail()
    await typeCode(RIGHT_CODE)
    fireEvent.change(await screen.findByLabelText('Új jelszó'), { target: { value: 'uj-jelszo-2026' } })
    fireEvent.change(screen.getByLabelText('Új jelszó újra'), { target: { value: 'uj-jelszo-2026' } })
    const save = screen.getByRole('button', { name: 'Jelszó mentése' })
    fireEvent.click(save)
    fireEvent.click(save)
    await waitFor(() => expect(count(calls, 'POST /auth/password/reset')).toBe(1))
    // Enter submits the form even while the button is disabled.
    fireEvent.submit(screen.getByLabelText('Új jelszó').closest('form')!)
    release()

    await screen.findByText('Megváltozott a jelszavad, most már beléphetsz.')
    expect(count(calls, 'POST /auth/password/reset')).toBe(1)
  })

  it('a failing account check after the reset still counts as done', async () => {
    backend({ 'GET /auth/me': () => ({ status: 500, data: { message: 'x', code: 'server_error' } }) })
    renderPanel()
    await sendEmail()
    await typeCode(RIGHT_CODE)
    fireEvent.change(await screen.findByLabelText('Új jelszó'), { target: { value: 'uj-jelszo-2026' } })
    fireEvent.change(screen.getByLabelText('Új jelszó újra'), { target: { value: 'uj-jelszo-2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Jelszó mentése' }))

    expect(await screen.findByText('Megváltozott a jelszavad, most már beléphetsz.')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

/** Where the player lands: the whole app, so the routes and the login form are real. */
describe('after a reset', { timeout: 15_000 }, () => {
  beforeAll(stubBrowserApis)
  // Sonner keeps active toasts globally and replays them to the next Toaster.
  afterEach(() => {
    toast.dismiss()
    cleanup()
  })

  async function resetInApp(me: unknown, { failedLoginFirst = false } = {}) {
    vi.resetModules()
    const { installFakeBackend: install } = await import('@/test/fakeBackend')
    install({
      'GET /auth/me': () => ({ status: 200, data: { data: me } }),
      'POST /auth/login': () => ({
        status: 422,
        data: { message: 'Hibás játékosnév vagy jelszó.', code: 'auth.invalid_credentials', errors: { username: ['Hibás játékosnév vagy jelszó.'] } },
      }),
      'POST /auth/password/forgot': (config) => codeSent((JSON.parse(config.data as string) as { email: string }).email),
      'POST /auth/password/forgot/verify': verify,
      'POST /auth/password/reset': () => ({ status: 200, data: { data: { username: 'Steve_01' } } }),
    })
    window.history.pushState({}, '', failedLoginFirst ? '/login' : '/elfelejtett-jelszo')
    const { default: App } = await import('@/App')
    render(<App />)
    if (failedLoginFirst) {
      // Most players get here right after a failed login.
      await screen.findAllByLabelText('Játékosnév')
      const loginForm = within(activeNameField()!.closest('form')!)
      fireEvent.change(loginForm.getByLabelText('Játékosnév'), { target: { value: 'Steve_01' } })
      fireEvent.change(loginForm.getByLabelText('Jelszó'), { target: { value: 'rossz-jelszo' } })
      fireEvent.click(loginForm.getByRole('button', { name: 'Belépés' }))
      await screen.findByText('Hibás játékosnév vagy jelszó.')
      fireEvent.click(screen.getByRole('link', { name: 'Elfelejtetted a jelszavad?' }))
    }
    await screen.findByRole('heading', { name: 'Elfelejtett jelszó' })
    await sendEmail()
    await typeCode(RIGHT_CODE)
    fireEvent.change(await screen.findByLabelText('Új jelszó'), { target: { value: 'uj-jelszo-2026' } })
    fireEvent.change(screen.getByLabelText('Új jelszó újra'), { target: { value: 'uj-jelszo-2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Jelszó mentése' }))
  }

  // The login form is the active slide; the registration form has a "Játékosnév" too, inert.
  const activeNameField = () => screen.getAllByLabelText('Játékosnév').find((input) => input.closest('[inert]') === null)

  it('a guest lands on the login with the name filled in', async () => {
    await resetInApp(null)

    await waitFor(() => expect((activeNameField() as HTMLInputElement | undefined)?.value).toBe('Steve_01'))
    expect(window.location.pathname).toBe('/login')
  })

  it('the login card no longer shows the failed login from before the reset', async () => {
    await resetInApp(null, { failedLoginFirst: true })

    await waitFor(() => expect((activeNameField() as HTMLInputElement | undefined)?.value).toBe('Steve_01'))
    expect(screen.queryByText('Hibás játékosnév vagy jelszó.')).toBeNull()
  })

  it('a visitor logged in as another account stays logged in and goes home', async () => {
    await resetInApp({ uuid: 'u-2', username: 'alex', display_name: 'Alex', registered_at: '2026-01-01T00:00:00Z' })

    expect(await screen.findByText('FŐOLDAL')).toBeTruthy()
  })
})
