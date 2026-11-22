/**
 * The forgotten password of a 2FA account (owner, 2026-11-22): the e-mail
 * alone must not get past 2FA, so after the mailed code the new-password step
 * also asks the authenticator code.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { Toaster } from '@/components/ui/sonner'
import { ForgotPasswordForm } from '@/features/auth/ForgotPasswordForm'
import { installFakeBackend, stubBrowserApis, type Handler, type Reply } from '@/test/fakeBackend'

const WRONG = 'Hibás kód. Nézd meg újra az alkalmazásban, a kód 30 másodpercenként változik.'

function codeSent(email: string): Reply {
  const now = Date.now()
  return {
    status: 202,
    headers: { date: new Date(now).toUTCString() },
    data: { data: { email, expires_at: new Date(now + 15 * 60_000).toISOString(), resend_at: new Date(now + 600_000).toISOString() } },
  }
}

function backend(twoFactorRequired: boolean, reset: Handler = () => ({ status: 200, data: { data: { username: 'Steve_01' } } })) {
  const bodies: unknown[] = []
  const calls = installFakeBackend({
    'POST /auth/password/forgot': (config) => codeSent((JSON.parse(config.data as string) as { email: string }).email),
    'POST /auth/password/forgot/verify': () => ({ status: 200, data: { data: { two_factor_required: twoFactorRequired } } }),
    'POST /auth/password/reset': (config) => {
      bodies.push(JSON.parse(config.data as string))
      return reset(config)
    },
    'GET /auth/me': () => ({ status: 200, data: { data: null } }),
  })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/forgot-password']}>
        <ForgotPasswordForm />
        <Toaster />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { calls, bodies }
}

const panel = () => within(screen.getByRole('region', { name: 'Elfelejtett jelszó' }))

async function reachPasswordStep() {
  fireEvent.change(panel().getByLabelText('E-mail cím'), { target: { value: 'steve@example.com' } })
  fireEvent.click(panel().getByRole('button', { name: 'Kód küldése' }))
  fireEvent.change(await panel().findByLabelText('Kód az e-mailből'), { target: { value: '123456' } })
  fireEvent.change(await screen.findByLabelText('Új jelszó'), { target: { value: 'uj-jelszo-2026' } })
  fireEvent.change(screen.getByLabelText('Új jelszó újra'), { target: { value: 'uj-jelszo-2026' } })
}

const save = () => fireEvent.click(screen.getByRole('button', { name: 'Jelszó mentése' }))

describe('a 2FA account\'s forgotten password', { timeout: 15_000 }, () => {
  beforeAll(stubBrowserApis)
  afterEach(cleanup)

  it('asks the authenticator code with the new password and sends it', async () => {
    const { bodies } = backend(true)
    await reachPasswordStep()

    fireEvent.change(screen.getByLabelText('Kód a hitelesítő alkalmazásból'), { target: { value: '654321' } })
    save()

    await waitFor(() =>
      expect(bodies).toEqual([{ password: 'uj-jelszo-2026', password_confirmation: 'uj-jelszo-2026', two_factor_code: '654321' }]),
    )
  })

  it('does not send the new password without the code', async () => {
    const { calls } = backend(true)
    await reachPasswordStep()

    save()

    expect(await screen.findByText('Írd be a hitelesítő alkalmazásban látható 6 jegyű kódot.')).toBeTruthy()
    expect(calls).not.toContain('POST /auth/password/reset')
  })

  it('shows a wrong code under its field and keeps the new password typed', async () => {
    backend(true, () => ({ status: 422, data: { message: WRONG, code: 'validation_failed', errors: { two_factor_code: [WRONG] } } }))
    await reachPasswordStep()

    fireEvent.change(screen.getByLabelText('Kód a hitelesítő alkalmazásból'), { target: { value: '111111' } })
    save()

    expect(await screen.findByText(WRONG)).toBeTruthy()
    expect((screen.getByLabelText('Új jelszó') as HTMLInputElement).value).toBe('uj-jelszo-2026')
  })

  it('an account without 2FA gets no code field and sends none (control)', async () => {
    const { bodies } = backend(false)
    await reachPasswordStep()

    expect(screen.queryByLabelText('Kód a hitelesítő alkalmazásból')).toBeNull()
    save()

    await waitFor(() => expect(bodies).toEqual([{ password: 'uj-jelszo-2026', password_confirmation: 'uj-jelszo-2026' }]))
  })
})
