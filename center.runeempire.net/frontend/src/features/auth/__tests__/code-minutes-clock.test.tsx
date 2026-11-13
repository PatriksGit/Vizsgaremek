import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { RegisterForm } from '@/features/auth/RegisterForm'

import { installFakeBackend, stubBrowserApis } from '@/test/fakeBackend'

// REGISTRATION_CODE_EXPIRES_MINUTES default; the e-mail says the same number.
const CODE_MINUTES = 15

/** The server's clock is right; it answers expires_at on its own clock, as PendingRegistrationResource does. */
function registrationBackend(serverNow: number) {
  installFakeBackend({
    'POST /auth/register': () => ({
      status: 202,
      // Every origin server with a clock sends Date (RFC 9110 6.6.1); Laravel and Cloudflare do.
      headers: { date: new Date(serverNow).toUTCString() },
      data: { data: { email: 'steve@example.com', expires_at: new Date(serverNow + CODE_MINUTES * 60_000).toISOString() } },
    }),
  })
}

async function startRegistrationWithClientClockOff(offsetMs: number) {
  const serverNow = Date.now()
  registrationBackend(serverNow)
  vi.useFakeTimers({ toFake: ['Date'], now: serverNow + offsetMs })

  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/register']}>
        <RegisterForm />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  fireEvent.change(screen.getByLabelText('Játékosnév'), { target: { value: 'Steve_01' } })
  fireEvent.change(screen.getByLabelText('E-mail cím'), { target: { value: 'steve@example.com' } })
  fireEvent.change(screen.getByLabelText('Jelszó'), { target: { value: 'jelszo-2026' } })
  fireEvent.change(screen.getByLabelText('Jelszó újra'), { target: { value: 'jelszo-2026' } })
  for (const box of screen.getAllByRole('checkbox')) fireEvent.click(box)
  fireEvent.click(screen.getByRole('button', { name: 'Kód küldése' }))
  await screen.findByText('Nézd meg az e-mailed')
}

describe('how long the page says the registration code works', () => {
  beforeAll(stubBrowserApis)
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('with the visitor clock right the page says what the e-mail says', async () => {
    await startRegistrationWithClientClockOff(0)

    expect(screen.getByText(/percig érvényes/).textContent).toContain(`${CODE_MINUTES} percig érvényes`)
  })

  it('with the visitor clock an hour behind (a dual-boot PC, a hand-set phone) it still says 15 minutes', async () => {
    await startRegistrationWithClientClockOff(-60 * 60_000)

    expect(screen.getByText(/percig érvényes/).textContent).toContain(`${CODE_MINUTES} percig érvényes`)
  })
})
