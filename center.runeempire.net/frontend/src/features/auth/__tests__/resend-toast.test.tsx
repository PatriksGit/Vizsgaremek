import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { toast } from 'sonner'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { Toaster } from '@/components/ui/sonner'
import { RegisterForm } from '@/features/auth/RegisterForm'

import { installFakeBackend, stubBrowserApis, type Reply } from '@/test/fakeBackend'

const NAME_HELD = 'Ez a név már regisztráció alatt áll.'
const RESENT = 'Új kódot küldtünk. A korábbi kód már nem érvényes.'

function pending(): Reply {
  return {
    status: 202,
    data: { data: { email: 'steve@example.com', expires_at: new Date(Date.now() + 15 * 60_000).toISOString() } },
  }
}

function renderRegisterForm() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/register']}>
        <RegisterForm />
      </MemoryRouter>
      <Toaster />
    </QueryClientProvider>,
  )
}

async function sendDetails() {
  fireEvent.change(screen.getByLabelText('Játékosnév'), { target: { value: 'Steve_01' } })
  fireEvent.change(screen.getByLabelText('E-mail cím'), { target: { value: 'steve@example.com' } })
  fireEvent.change(screen.getByLabelText('Jelszó'), { target: { value: 'jelszo-2026' } })
  fireEvent.change(screen.getByLabelText('Jelszó újra'), { target: { value: 'jelszo-2026' } })
  for (const box of screen.getAllByRole('checkbox')) fireEvent.click(box)
  fireEvent.click(screen.getByRole('button', { name: 'Kód küldése' }))
  await screen.findByText('Nézd meg az e-mailed')
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 300))

describe('resend a registration code', () => {
  beforeAll(stubBrowserApis)
  // Sonner keeps active toasts globally and replays them to the next Toaster.
  afterEach(() => {
    toast.dismiss()
    cleanup()
  })

  it('a resend the backend accepts says a new code was sent', async () => {
    let registerCalls = 0
    installFakeBackend({ 'POST /auth/register': () => (registerCalls++, pending()) })
    renderRegisterForm()
    await sendDetails()

    fireEvent.click(screen.getByRole('button', { name: 'Új kódot kérek' }))

    expect(await screen.findByText(RESENT)).toBeTruthy()
    expect(registerCalls).toBe(2)
  })

  it('a resend the backend refuses with a field error does not claim a new code was sent', async () => {
    let registerCalls = 0
    installFakeBackend({
      'POST /auth/register': () =>
        registerCalls++ === 0
          ? pending()
          : // StartRegistration::nameHeld(): the name was taken while the first code waited.
            { status: 422, data: { message: NAME_HELD, errors: { display_name: [NAME_HELD] } } },
    })
    renderRegisterForm()
    await sendDetails()

    fireEvent.click(screen.getByRole('button', { name: 'Új kódot kérek' }))

    // The player is back on the details step with the backend's reason...
    expect(await screen.findByText(NAME_HELD)).toBeTruthy()
    await settle()
    // ...and no code went out, so nothing may say one did.
    expect(screen.queryByText(RESENT)).toBeNull()
  })
})
