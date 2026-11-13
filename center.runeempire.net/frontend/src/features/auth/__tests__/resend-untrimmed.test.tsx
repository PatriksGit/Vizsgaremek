/**
 * Frontend review 2026-11-13d (auth-resend-untrimmed): RegisterForm remembers the details the last
 * code went out for, so going back and sending them unchanged returns to the
 * code step without a request. A first send records the schema's trimmed
 * values (handleSubmit), but "Új kódot kérek" records the raw form values
 * (form.getValues()). A name typed with a trailing space -- a phone keyboard
 * adds one after a suggestion -- then no longer matches after a resend: the
 * unchanged details go out again and the 10-minute cooldown refuses them.
 *
 * Control, run by hand (REPRO_CONTROL=1): the same steps with the name typed without the space.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { RegisterForm } from '@/features/auth/RegisterForm'
import { installFakeBackend, stubBrowserApis, type Reply } from '@/test/fakeBackend'

const CONTROL = import.meta.env.REPRO_CONTROL === '1'
const COOLDOWN = 'Erre az e-mail címre nemrég küldtünk kódot, próbáld újra kicsit később.'

/** StartRegistration: one code per address per 600 s (TrimStrings trims the body first), the code works 15 minutes. */
function registrationBackend() {
  const lastMailAt = new Map<string, number>()
  const requests: string[] = []
  installFakeBackend({
    'POST /auth/register': (config): Reply => {
      const email = (JSON.parse(config.data as string) as { email: string }).email.trim()
      requests.push(email)
      const last = lastMailAt.get(email)
      if (last !== undefined && Date.now() - last < 600_000) return { status: 429, data: { message: COOLDOWN } }
      lastMailAt.set(email, Date.now())
      return { status: 202, data: { data: { email, expires_at: new Date(Date.now() + 15 * 60_000).toISOString() } } }
    },
  })
  return requests
}

describe('back from the code step after a resend, sent unchanged', () => {
  beforeAll(stubBrowserApis)
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it(CONTROL ? 'control: name typed without a trailing space' : 'name typed with a trailing space', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: Date.now() })
    const requests = registrationBackend()
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/register']}>
          <RegisterForm />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    fireEvent.change(screen.getByLabelText('Játékosnév'), { target: { value: CONTROL ? 'Steve_01' : 'Steve_01 ' } })
    fireEvent.change(screen.getByLabelText('E-mail cím'), { target: { value: 'steve@example.com' } })
    fireEvent.change(screen.getByLabelText('Jelszó'), { target: { value: 'jelszo-2026' } })
    fireEvent.change(screen.getByLabelText('Jelszó újra'), { target: { value: 'jelszo-2026' } })
    for (const box of screen.getAllByRole('checkbox')) fireEvent.click(box)
    fireEvent.click(screen.getByRole('button', { name: 'Kód küldése' }))
    await screen.findByText('Nézd meg az e-mailed')

    // The mail does not show up; after the cooldown the player asks for a new code...
    vi.setSystemTime(Date.now() + 11 * 60_000)
    fireEvent.click(screen.getByRole('button', { name: 'Új kódot kérek' }))
    await screen.findByRole('button', { name: 'Új kódot kérek' })
    await act(() => new Promise((resolve) => setTimeout(resolve, 100)))
    expect(requests).toHaveLength(2)

    // ...then goes back to check the address, sees it is right, and sends it unchanged.
    fireEvent.click(screen.getByRole('button', { name: 'Javítsd ki' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Kód küldése' }))
    await act(() => new Promise((resolve) => setTimeout(resolve, 100)))

    expect({ codeStep: screen.queryByLabelText('Megerősítő kód') !== null, cooldownShown: screen.queryByText(COOLDOWN) !== null, requests: requests.length })
      .toEqual({ codeStep: true, cooldownShown: false, requests: 2 })
  })
})
