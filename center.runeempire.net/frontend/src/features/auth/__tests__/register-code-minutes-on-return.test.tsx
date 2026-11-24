/**
 * Regression test (frontend review 2026-11-23).
 * AUTH-1: "Javítsd ki" and the same details sent again return to the code
 * step without a request (RegisterForm's last-sent cache), but the step still
 * says the minutes the code had when it was first mailed.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'

import { RegisterForm } from '@/features/auth/RegisterForm'
import { installFakeBackend, stubBrowserApis } from '@/test/fakeBackend'

beforeAll(stubBrowserApis)
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

async function mailCodeThenComeBackAfter(minutes: number) {
  const start = Date.now()
  vi.useFakeTimers({ toFake: ['Date'], now: start })
  const requests: string[] = []
  installFakeBackend({
    'POST /auth/register': () => {
      requests.push('register')
      return {
        status: 202,
        headers: { date: new Date(Date.now()).toUTCString() },
        data: { data: { email: 'steve@example.com', expires_at: new Date(Date.now() + 15 * 60_000).toISOString() } },
      }
    },
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
  await screen.findByText('Nézd meg az e-mailed')

  // The player looks at the address again a while later, finds it right, and sends the details unchanged.
  vi.setSystemTime(start + minutes * 60_000)
  fireEvent.click(screen.getByRole('button', { name: 'Javítsd ki' }))
  fireEvent.click(screen.getByRole('button', { name: 'Kód küldése' }))
  await screen.findByText('Nézd meg az e-mailed')
  return requests
}

it('repro: back after 9 minutes, the code step says the 6 minutes left, not 15', async () => {
  const requests = await mailCodeThenComeBackAfter(9)

  expect(requests).toHaveLength(1)
  expect(screen.getByText(/percig érvényes/).textContent).toContain('6 percig érvényes')
})

it('control: back at once, the code step says 15 minutes', async () => {
  const requests = await mailCodeThenComeBackAfter(0)

  expect(requests).toHaveLength(1)
  expect(screen.getByText(/percig érvényes/).textContent).toContain('15 percig érvényes')
})
