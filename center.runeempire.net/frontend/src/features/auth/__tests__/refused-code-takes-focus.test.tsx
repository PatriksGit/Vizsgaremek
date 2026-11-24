/**
 * Regression test (final review 2026-11-23 Minor 6, reproduced with Playwright 2026-11-24).
 * useCodeForm gave the code field the keyboard back inside the submit handler, while the caller
 * still disabled the field (isSubmitting is true until the handler ends). A browser refuses focus
 * on a disabled input, so after a refused code the caret was gone (document.activeElement was
 * BODY) and on a phone the keyboard closed: registration, the login's 2FA step and both 2FA dialogs.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, expect, it } from 'vitest'

import { RegisterForm } from '@/features/auth/RegisterForm'
import { installFakeBackend, stubBrowserApis } from '@/test/fakeBackend'

const WRONG = 'A kód érvénytelen vagy lejárt.'

beforeAll(stubBrowserApis)
afterEach(cleanup)

async function refuseACode() {
  installFakeBackend({
    'POST /auth/register': () => ({
      status: 202,
      headers: { date: new Date().toUTCString() },
      data: { data: { email: 'steve@example.com', expires_at: new Date(Date.now() + 15 * 60_000).toISOString() } },
    }),
    'POST /auth/register/verify': () => ({
      status: 422,
      data: { message: WRONG, errors: { code: [WRONG] }, code: 'validation_failed' },
    }),
  })
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
  const code = (await screen.findByLabelText('Megerősítő kód')) as HTMLInputElement
  // The whole code at once: the field sends itself on the last digit.
  fireEvent.change(code, { target: { value: '000001' } })
  // A browser drops the focus of a field that gets disabled (Chrome: activeElement is BODY); jsdom keeps it.
  await waitFor(() => expect(code.disabled).toBe(true))
  code.blur()
  await screen.findByText(WRONG)
  await waitFor(() => expect(code.disabled).toBe(false))
  return code
}

it('repro: after a refused code the code field has the keyboard again', async () => {
  const code = await refuseACode()
  await waitFor(() => expect(document.activeElement).toBe(code))
})

it('control: after a refused code the field is enabled and empty', async () => {
  const code = await refuseACode()
  expect(code.value).toBe('')
})
