import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { LoginForm } from '@/features/auth/LoginForm'
import { RegisterForm } from '@/features/auth/RegisterForm'

import { installFakeBackend, stubBrowserApis, type Reply } from '@/test/fakeBackend'

/** Evidence, expected green: a double click sends one request while the first is on its way. */
function slow(reply: Reply) {
  return () => new Promise<Reply>((resolve) => setTimeout(() => resolve(reply), 100))
}

function wrap(children: React.ReactNode) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

const wait = (ms: number) => act(() => new Promise((resolve) => setTimeout(resolve, ms)))

describe('double submits', () => {
  beforeAll(stubBrowserApis)
  afterEach(cleanup)

  it('login: two clicks, one POST', async () => {
    const calls = installFakeBackend({ 'POST /auth/login': slow({ status: 422, data: { message: 'Hibás játékosnév vagy jelszó.' } }) })
    render(wrap(<LoginForm />))
    fireEvent.change(screen.getByLabelText('Játékosnév'), { target: { value: 'Steve_01' } })
    fireEvent.change(screen.getByLabelText('Jelszó'), { target: { value: 'jelszo-2026' } })
    const button = screen.getByRole('button', { name: 'Belépés' })
    fireEvent.click(button)
    await wait(10)
    fireEvent.click(button)
    await wait(300)
    expect(calls.filter((call) => call === 'POST /auth/login')).toHaveLength(1)
  })

  it('registration code: two clicks on "Fiók létrehozása", one verify', async () => {
    const calls = installFakeBackend({
      'POST /auth/register': () => ({ status: 202, data: { data: { email: 'steve@example.com', expires_at: new Date(Date.now() + 900_000).toISOString() } } }),
      'POST /auth/register/verify': slow({ status: 422, data: { message: 'A kód érvénytelen vagy lejárt.', errors: { code: ['A kód érvénytelen vagy lejárt.'] } } }),
    })
    render(wrap(<RegisterForm />))
    fireEvent.change(screen.getByLabelText('Játékosnév'), { target: { value: 'Steve_01' } })
    fireEvent.change(screen.getByLabelText('E-mail cím'), { target: { value: 'steve@example.com' } })
    fireEvent.change(screen.getByLabelText('Jelszó'), { target: { value: 'jelszo-2026' } })
    fireEvent.change(screen.getByLabelText('Jelszó újra'), { target: { value: 'jelszo-2026' } })
    for (const box of screen.getAllByRole('checkbox')) fireEvent.click(box)
    fireEvent.click(screen.getByRole('button', { name: 'Kód küldése' }))
    await screen.findByText('Nézd meg az e-mailed')

    fireEvent.change(screen.getByLabelText('Megerősítő kód'), { target: { value: '123456' } })
    const create = screen.getByRole('button', { name: 'Fiók létrehozása' })
    fireEvent.click(create)
    await wait(10)
    fireEvent.click(create)
    fireEvent.click(screen.getByRole('button', { name: 'Új kódot kérek' }))
    await wait(300)
    expect(calls.filter((call) => call === 'POST /auth/register/verify')).toHaveLength(1)
    expect(calls.filter((call) => call === 'POST /auth/register')).toHaveLength(1)
    expect(await screen.findByText('A kód érvénytelen vagy lejárt.')).toBeTruthy()
  })
})
