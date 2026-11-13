/**
 * Frontend review 2026-11-13 (AUTH-1): a mailed registration code works for 15
 * minutes, but one address gets a new code only every 10 minutes. Going back
 * from the code step, or reloading the page on it, must never leave the player
 * holding a working code with nowhere to type it.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { RegisterForm } from '@/features/auth/RegisterForm'
import { installFakeBackend, stubBrowserApis, type Reply } from '@/test/fakeBackend'

// StartRegistration::handle(): one code per address per 600 s, the code itself works 15 minutes.
const COOLDOWN = 'Erre az e-mail címre nemrég küldtünk kódot, próbáld újra kicsit később.'

/** The fake backend: the first code for an address goes out, a second one within the cooldown is a 429. */
function registrationBackend() {
  const mailed = new Set<string>()
  const requests: string[] = []
  installFakeBackend({
    'POST /auth/register': (config): Reply => {
      const { email } = JSON.parse(config.data as string) as { email: string }
      requests.push(email)
      if (mailed.has(email)) return { status: 429, data: { message: COOLDOWN } }
      mailed.add(email)
      return { status: 202, data: { data: { email, expires_at: new Date(Date.now() + 15 * 60_000).toISOString() } } }
    },
  })
  return requests
}

function renderRegisterForm() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/register']}>
        <RegisterForm />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function fillDetails(email: string) {
  fireEvent.change(screen.getByLabelText('Játékosnév'), { target: { value: 'Steve_01' } })
  fireEvent.change(screen.getByLabelText('E-mail cím'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Jelszó'), { target: { value: 'jelszo-2026' } })
  fireEvent.change(screen.getByLabelText('Jelszó újra'), { target: { value: 'jelszo-2026' } })
  for (const box of screen.getAllByRole('checkbox')) {
    if (box.getAttribute('aria-checked') !== 'true') fireEvent.click(box)
  }
}

async function sendDetails() {
  fireEvent.click(screen.getByRole('button', { name: 'Kód küldése' }))
  await screen.findByText(/Nézd meg az e-mailed|nemrég küldtünk kódot/)
}

/** Where the player can type the code that is in their mailbox. */
const codeField = () => screen.queryByLabelText('Megerősítő kód')

describe('a mailed registration code can always be entered', () => {
  beforeAll(stubBrowserApis)
  afterEach(cleanup)

  it('back to the details, a different address gets its own code step', async () => {
    registrationBackend()
    renderRegisterForm()
    fillDetails('steve@example.com')
    await sendDetails()
    fireEvent.click(screen.getByRole('button', { name: 'Javítsd ki' }))

    fillDetails('steve2@example.com')
    await sendDetails()

    expect(codeField()).not.toBeNull()
  })

  it('back to the details and sent again unchanged: straight back to the code step, no new request', async () => {
    const requests = registrationBackend()
    renderRegisterForm()
    fillDetails('steve@example.com')
    await sendDetails()

    // "Rossz e-mail címet adtál meg? Javítsd ki" -- the address was right after all.
    fireEvent.click(screen.getByRole('button', { name: 'Javítsd ki' }))
    await sendDetails()

    expect(codeField()).not.toBeNull()
    expect(screen.queryByText(COOLDOWN)).toBeNull()
    expect(requests).toEqual(['steve@example.com'])
  })

  it('"Új kódot kérek" still asks the backend for a fresh code', async () => {
    const requests = registrationBackend()
    renderRegisterForm()
    fillDetails('steve@example.com')
    await sendDetails()

    fireEvent.click(screen.getByRole('button', { name: 'Új kódot kérek' }))
    await screen.findByText(COOLDOWN)

    expect(requests).toEqual(['steve@example.com', 'steve@example.com'])
  })

  it('page reloaded on the code step (the code is in the mailbox): the cooldown offers to type it in', async () => {
    registrationBackend()
    renderRegisterForm()
    fillDetails('steve@example.com')
    await sendDetails()

    // A reload, or a phone discarding the tab while the player reads the mail: the in-memory step is gone.
    cleanup()
    renderRegisterForm()
    fillDetails('steve@example.com')
    await sendDetails()
    expect(screen.getByText(COOLDOWN)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Írd be' }))

    expect(codeField()).not.toBeNull()
    expect(screen.getByText('steve@example.com')).toBeTruthy()
  })
})
