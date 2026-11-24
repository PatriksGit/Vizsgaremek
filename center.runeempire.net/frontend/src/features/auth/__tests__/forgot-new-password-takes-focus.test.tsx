/**
 * Review 2026-11-24 AU-S1 (structure, not a bug): the forgotten password panel's new password step became its own
 * component (ForgotNewPasswordStep), and the keyboard moved from the parent's focus request to the step's mount
 * effect. No test pinned that focus move, so this one does: a verified code gives "Új jelszó" the keyboard.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, expect, it } from 'vitest'

import { ForgotPasswordForm } from '@/features/auth/ForgotPasswordForm'
import { installFakeBackend, stubBrowserApis } from '@/test/fakeBackend'

beforeAll(stubBrowserApis)
afterEach(cleanup)

it('after the code checks out, the focus is in "Új jelszó"', async () => {
  const now = Date.now()
  installFakeBackend({
    'POST /auth/password/forgot': () => ({
      status: 202,
      headers: { date: new Date(now).toUTCString() },
      data: { data: { email: 'steve@example.com', expires_at: new Date(now + 900_000).toISOString(), resend_at: new Date(now + 600_000).toISOString() } },
    }),
    'POST /auth/password/forgot/verify': () => ({ status: 200, data: { data: { two_factor_required: false } } }),
  })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/forgot-password']}>
        <ForgotPasswordForm />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  fireEvent.change(screen.getByLabelText('E-mail cím'), { target: { value: 'steve@example.com' } })
  fireEvent.click(screen.getByRole('button', { name: 'Kód küldése' }))
  fireEvent.change(await screen.findByLabelText('Kód az e-mailből'), { target: { value: '123456' } })

  const password = await screen.findByLabelText('Új jelszó')
  await waitFor(() => expect(document.activeElement).toBe(password))
})
