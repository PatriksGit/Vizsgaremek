/**
 * Review 2026-11-16 of the forgotten password panel (fresh reviewer + CodeRabbit):
 * ways it stranded the player, left a password behind, or spent a code guess.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { toast } from 'sonner'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { Toaster } from '@/components/ui/sonner'
import { ForgotPasswordForm } from '@/features/auth/ForgotPasswordForm'
import { installFakeBackend, stubBrowserApis, type Handler, type Reply } from '@/test/fakeBackend'

const RIGHT_CODE = '123456'
const COOLDOWN = 'Erre az e-mail címre nemrég küldtünk kódot, próbáld újra kicsit később.'

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

const emailOf = (config: Parameters<Handler>[0]) => (JSON.parse(config.data as string) as { email: string }).email

function verify(config: Parameters<Handler>[0]): Reply {
  const { code } = JSON.parse(config.data as string) as { code: string }
  if (code === RIGHT_CODE) return { status: 204 }
  return { status: 422, data: { message: 'A kód érvénytelen vagy lejárt.', code: 'validation_failed', errors: { code: ['A kód érvénytelen vagy lejárt.'] } } }
}

const cooldown429 = (seconds: number): Reply => ({
  status: 429,
  headers: { 'retry-after': String(seconds) },
  data: { message: COOLDOWN, code: 'auth.code_recently_sent' },
})

function backend(routes: Record<string, Handler> = {}) {
  return installFakeBackend({
    'POST /auth/password/forgot': (config) => codeSent(emailOf(config)),
    'POST /auth/password/forgot/verify': verify,
    'POST /auth/password/reset': () => ({ status: 200, data: { data: { username: 'Steve_01' } } }),
    'GET /auth/me': () => ({ status: 200, data: { data: null } }),
    ...routes,
  })
}

function renderPanel(queryClient = new QueryClient()) {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/elfelejtett-jelszo']}>
        <ForgotPasswordForm />
        <Toaster />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const count = (calls: string[], key: string) => calls.filter((call) => call === key).length
const codeInput = () => screen.getByLabelText('Kód az e-mailből') as HTMLInputElement

async function sendEmail(email = 'steve@example.com') {
  fireEvent.change(screen.getByLabelText('E-mail cím'), { target: { value: email } })
  fireEvent.click(screen.getByRole('button', { name: 'Kód küldése' }))
  return screen.findByLabelText('Kód az e-mailből')
}

const typeCode = (code: string) => fireEvent.change(codeInput(), { target: { value: code } })

async function toPasswordStep() {
  await sendEmail()
  typeCode(RIGHT_CODE)
  return screen.findByLabelText('Új jelszó')
}

async function saveNewPassword() {
  fireEvent.change(await toPasswordStep(), { target: { value: 'uj-jelszo-2026' } })
  fireEvent.change(screen.getByLabelText('Új jelszó újra'), { target: { value: 'uj-jelszo-2026' } })
  fireEvent.click(screen.getByRole('button', { name: 'Jelszó mentése' }))
}

describe('the forgotten password panel after review', { timeout: 15_000 }, () => {
  beforeAll(stubBrowserApis)
  // Sonner keeps active toasts globally and replays them to the next Toaster.
  afterEach(() => {
    toast.dismiss()
    cleanup()
  })

  it('a finished reset leaves nothing behind: the panel starts again at an empty e-mail', async () => {
    backend()
    renderPanel()
    await saveNewPassword()
    await screen.findByText('Megváltozott a jelszavad, most már beléphetsz.')

    await waitFor(() => expect(screen.queryByLabelText('Új jelszó')).toBeNull())
    const email = screen.getByLabelText('E-mail cím') as HTMLInputElement
    expect(email.value).toBe('')
    expect(email.readOnly).toBe(false)
  })

  it('after a wrong code the focus is back in the code field', async () => {
    backend()
    renderPanel()
    await sendEmail()
    typeCode('654321')
    // A browser drops the focus from the field while it is disabled for the check (jsdom does not).
    ;(document.activeElement as HTMLElement | null)?.blur()
    await screen.findByText('A kód érvénytelen vagy lejárt.')

    await waitFor(() => expect(document.activeElement).toBe(codeInput()))
  })

  it('Enter in the locked e-mail field at the password step changes nothing', async () => {
    backend()
    renderPanel()
    await toPasswordStep()

    fireEvent.submit(screen.getByLabelText('E-mail cím').closest('form')!)
    // handleSubmit validates asynchronously: give it time to act before looking.
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)))

    expect(screen.getByLabelText('Új jelszó')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Kód ellenőrzése/ })).toBeNull()
  })

  it('"Írd be" belongs to the address it was offered for: editing the address takes it away', async () => {
    backend({ 'POST /auth/password/forgot': () => cooldown429(480) })
    renderPanel()
    fireEvent.change(screen.getByLabelText('E-mail cím'), { target: { value: 'steve@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Kód küldése' }))
    await screen.findByRole('button', { name: 'Írd be' })

    fireEvent.change(screen.getByLabelText('E-mail cím'), { target: { value: 'alex@example.com' } })

    expect(screen.queryByRole('button', { name: 'Írd be' })).toBeNull()
  })

  it('"Írd be" clears the cooldown warning', async () => {
    backend({ 'POST /auth/password/forgot': () => cooldown429(480) })
    renderPanel()
    fireEvent.change(screen.getByLabelText('E-mail cím'), { target: { value: 'steve@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Kód küldése' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Írd be' }))

    await screen.findByLabelText('Kód az e-mailből')
    expect(screen.queryByText(COOLDOWN)).toBeNull()
  })

  it('typing the code while a new one is being sent sends no verify (it would spend a guess)', async () => {
    let releaseResend: () => void = () => {}
    let forgotCalls = 0
    const calls = backend({
      'POST /auth/password/forgot': (config) => {
        forgotCalls += 1
        const reply = codeSent(emailOf(config), -2)
        return forgotCalls === 1 ? reply : new Promise<Reply>((resolve) => (releaseResend = () => resolve(reply)))
      },
    })
    renderPanel()
    await sendEmail()
    fireEvent.click(await screen.findByRole('button', { name: 'Kód újraküldése' }))
    await waitFor(() => expect(count(calls, 'POST /auth/password/forgot')).toBe(2))

    typeCode('654321')
    releaseResend()

    await screen.findByText('Új kódot küldtünk. A korábbi kód már nem érvényes.')
    expect(count(calls, 'POST /auth/password/forgot/verify')).toBe(0)
  })

  it('a resend refused by the cooldown starts the countdown again', async () => {
    let forgotCalls = 0
    backend({
      'POST /auth/password/forgot': (config) => {
        forgotCalls += 1
        return forgotCalls === 1 ? codeSent(emailOf(config), -2) : cooldown429(300)
      },
    })
    renderPanel()
    await sendEmail()
    fireEvent.click(await screen.findByRole('button', { name: 'Kód újraküldése' }))

    expect(await screen.findByRole('button', { name: /Újraküldés (300|299) mp múlva/ })).toBeTruthy()
  })

  it('a failing account check after the reset does not keep the old account, nor hang the button', async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['account'], { uuid: 'u-1', username: 'steve_01', display_name: 'Steve_01', registered_at: null })
    let meCalls = 0
    backend({
      // The first check fails at once; any refetch after it hangs (a backend gone quiet).
      'GET /auth/me': () => {
        meCalls += 1
        return meCalls === 1 ? { status: 500, data: { message: 'x', code: 'server_error' } } : new Promise<Reply>(() => {})
      },
    })
    renderPanel(queryClient)
    await saveNewPassword()

    expect(await screen.findByText('Megváltozott a jelszavad, most már beléphetsz.')).toBeTruthy()
    expect(queryClient.getQueryData(['account'])).toBeNull()
  })
})
