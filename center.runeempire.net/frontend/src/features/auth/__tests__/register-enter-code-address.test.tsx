/**
 * Regression test (review 2026-11-17, A1). The bug it guards against: after a reload, the registration's cooldown
 * 429 offers "Már megkaptad a kódot? Írd be" for the address it came for. Editing
 * the address afterwards keeps the link, and it opens the code step for the NEW
 * address: the right code from the mailbox is then checked against an address
 * that never got one.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { RegisterForm } from '@/features/auth/RegisterForm'
import { installFakeBackend, stubBrowserApis, type Reply } from '@/test/fakeBackend'

const COOLDOWN = 'Erre az e-mail címre nemrég küldtünk kódot, próbáld újra kicsit később.'
const INVALID = 'A kód érvénytelen vagy lejárt.'
const MAILED_TO = 'steve@example.com'
const RIGHT_CODE = '123456'

function backend() {
  const verified: string[] = []
  installFakeBackend({
    // The code went to MAILED_TO before the reload: this client's cooldown answers for it.
    'POST /auth/register': (): Reply => ({
      status: 429,
      headers: { 'retry-after': '480' },
      data: { message: COOLDOWN, code: 'auth.code_recently_sent' },
    }),
    'POST /auth/register/verify': (config): Reply => {
      const { email, code } = JSON.parse(config.data as string) as { email: string; code: string }
      verified.push(email)
      if (email === MAILED_TO && code === RIGHT_CODE) {
        return { status: 201, data: { data: { uuid: 'u', username: 'steve_01', display_name: 'Steve_01', registered_at: null } } }
      }
      return { status: 422, data: { message: INVALID, code: 'auth.invalid_code', errors: { code: [INVALID] } } }
    },
  })
  return verified
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

async function enterMailedCode(verified: string[]) {
  const enterCode = screen.queryByRole('button', { name: 'Írd be' })
  if (!enterCode) return
  fireEvent.click(enterCode)
  fireEvent.change(screen.getByLabelText('Megerősítő kód'), { target: { value: RIGHT_CODE } })
  // The last digit sends the code by itself (auth K1); a click on the button meanwhile adds nothing.
  fireEvent.click(screen.getByRole('button', { name: /^Fiók létrehozása/ }))
  await waitFor(() => expect(verified.length).toBe(1))
}

describe('registration "Írd be" after the cooldown', { timeout: 15_000 }, () => {
  beforeAll(stubBrowserApis)
  afterEach(cleanup)

  it('"Írd be" is gone once the address is edited', async () => {
    const verified = backend()
    renderRegisterForm()
    fillDetails(MAILED_TO)
    fireEvent.click(screen.getByRole('button', { name: 'Kód küldése' }))
    await screen.findByText(COOLDOWN)

    // The player fixes the address in the field but does not send the form again.
    fireEvent.change(screen.getByLabelText('E-mail cím'), { target: { value: 'alex@example.com' } })
    await enterMailedCode(verified)

    // The right code from the mailbox is only ever checked against the address it was mailed to.
    expect(verified.filter((email) => email !== MAILED_TO)).toEqual([])
  })

  it('"Írd be" opens the code step for the address the code went to', async () => {
    const verified = backend()
    renderRegisterForm()
    fillDetails(MAILED_TO)
    fireEvent.click(screen.getByRole('button', { name: 'Kód küldése' }))
    await screen.findByText(COOLDOWN)

    await enterMailedCode(verified)

    expect(verified).toEqual([MAILED_TO])
  })
})
