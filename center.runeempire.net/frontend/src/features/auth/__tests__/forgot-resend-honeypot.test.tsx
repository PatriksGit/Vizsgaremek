/**
 * Regression test (review 2026-11-17, A2). The bug it guards against: a bot that ticks the forgotten password form's
 * hidden trap gets the usual 202 and nothing is mailed. Its "Kód újraküldése"
 * then sends the address WITHOUT the trap, so the backend mails a real code.
 * The registration's resend keeps the trap (RegisterForm sends the form values).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { ForgotPasswordForm } from '@/features/auth/ForgotPasswordForm'
import { installFakeBackend, stubBrowserApis } from '@/test/fakeBackend'

function backend() {
  const bodies: Record<string, unknown>[] = []
  installFakeBackend({
    'POST /auth/password/forgot': (config) => {
      const body = JSON.parse(config.data as string) as Record<string, unknown>
      bodies.push(body)
      const now = Date.now()
      // resend_at is the end of the cooldown; here already over, as if the bot waited it out.
      return {
        status: 202,
        data: { data: { email: body.email, expires_at: new Date(now + 15 * 60_000).toISOString(), resend_at: new Date(now).toISOString() } },
      }
    },
  })
  return bodies
}

function renderPanel() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/forgot-password']}>
        <ForgotPasswordForm />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function sendThenResend(tickTrap: boolean, bodies: Record<string, unknown>[]) {
  const { container } = renderPanel()
  fireEvent.change(screen.getByLabelText('E-mail cím'), { target: { value: 'victim@example.com' } })
  if (tickTrap) fireEvent.click(container.querySelector<HTMLInputElement>('input[name="newsletter"]')!)
  fireEvent.click(screen.getByRole('button', { name: 'Kód küldése' }))
  await screen.findByLabelText('Kód az e-mailből')
  fireEvent.click(await screen.findByRole('button', { name: 'Kód újraküldése' }))
  await waitFor(() => expect(bodies.length).toBe(2))
}

describe('the forgotten password resend and the bot trap', { timeout: 15_000 }, () => {
  beforeAll(stubBrowserApis)
  afterEach(cleanup)

  it('a visitor who ticked the trap resends with the trap too', async () => {
    const bodies = backend()
    await sendThenResend(true, bodies)

    // A visitor who tripped the trap never gets a request through without it.
    expect(bodies.map((body) => body.newsletter)).toEqual([true, true])
  })

  it('a visitor who did not tick it resends without it', async () => {
    const bodies = backend()
    await sendThenResend(false, bodies)

    expect(bodies.map((body) => body.newsletter)).toEqual([undefined, undefined])
  })
})
