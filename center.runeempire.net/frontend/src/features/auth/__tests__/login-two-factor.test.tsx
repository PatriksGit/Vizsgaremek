/**
 * Logging in with 2FA (2026-11-22): the right password of a 2FA account
 * answers 202, the login card asks for the authenticator code, and only the
 * code logs in.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, expect, it } from 'vitest'

import { LoginForm } from '@/features/auth/LoginForm'
import { installFakeBackend, stubBrowserApis, type Handler } from '@/test/fakeBackend'

const ACCOUNT = {
  uuid: 'u-1',
  username: 'steve_01',
  display_name: 'Steve_01',
  email: 'steve@example.com',
  two_factor_enabled: true,
  can_manage: false,
  registered_at: '2026-01-01T00:00:00Z',
}
const WRONG = 'Hibás kód. Nézd meg újra az alkalmazásban, a kód 30 másodpercenként változik.'
const EXPIRED = 'A belépés lejárt, add meg újra a jelszavad.'

beforeAll(stubBrowserApis)
afterEach(cleanup)

function renderLogin(codeAnswer: Handler) {
  const codes: string[] = []
  const calls = installFakeBackend({
    'POST /auth/login': () => ({ status: 202, data: { data: { two_factor_required: true } } }),
    'POST /auth/login/two-factor': (config) => {
      codes.push((JSON.parse(config.data as string) as { code: string }).code)
      return codeAnswer(config)
    },
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['account'], null)
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { client, calls, codes }
}

async function givePassword() {
  fireEvent.change(screen.getByLabelText('Játékosnév'), { target: { value: 'Steve_01' } })
  fireEvent.change(screen.getByLabelText('Jelszó'), { target: { value: 'titkos-jelszo' } })
  fireEvent.click(screen.getByRole('button', { name: 'Belépés' }))
  return screen.findByRole('heading', { name: 'Kétlépcsős azonosítás' })
}

const typeCode = (code: string) => fireEvent.change(screen.getByLabelText('Kód az alkalmazásból'), { target: { value: code } })

it('asks for the code after the right password, without logging in yet', async () => {
  const { client } = renderLogin(() => ({ status: 200, data: { data: ACCOUNT } }))

  await givePassword()

  expect(client.getQueryData(['account'])).toBeNull()
  expect(screen.queryByLabelText('Jelszó')).toBeNull()
})

it('the code logs in as soon as its last digit is typed', async () => {
  const { client, codes } = renderLogin(() => ({ status: 200, data: { data: ACCOUNT } }))
  await givePassword()

  typeCode('123456')

  await waitFor(() => expect(client.getQueryData(['account'])).toEqual(ACCOUNT))
  expect(codes).toEqual(['123456'])
})

it('a wrong code shows under the field and may be typed again', async () => {
  let answer: 'wrong' | 'right' = 'wrong'
  const { client } = renderLogin(() =>
    answer === 'wrong'
      ? { status: 422, data: { message: WRONG, code: 'validation_failed', errors: { code: [WRONG] } } }
      : { status: 200, data: { data: ACCOUNT } },
  )
  await givePassword()

  typeCode('111111')
  expect(await screen.findByText(WRONG)).toBeTruthy()
  expect((screen.getByLabelText('Kód az alkalmazásból') as HTMLInputElement).value).toBe('')

  answer = 'right'
  typeCode('222222')
  await waitFor(() => expect(client.getQueryData(['account'])).toEqual(ACCOUNT))
})

it('when the five minutes ran out it goes back to the password with the reason', async () => {
  renderLogin(() => ({ status: 422, data: { message: EXPIRED, code: 'auth.two_factor_expired' } }))
  await givePassword()

  typeCode('123456')

  expect(await screen.findByText(EXPIRED)).toBeTruthy()
  expect((screen.getByLabelText('Jelszó') as HTMLInputElement).value).toBe('')
  expect(screen.queryByRole('heading', { name: 'Kétlépcsős azonosítás' })).toBeNull()
})

it('"Vissza a jelszóhoz" goes back without sending anything', async () => {
  const { calls } = renderLogin(() => ({ status: 200, data: { data: ACCOUNT } }))
  await givePassword()

  fireEvent.click(screen.getByRole('button', { name: 'Vissza a jelszóhoz' }))

  expect(await screen.findByLabelText('Jelszó')).toBeTruthy()
  expect(calls).not.toContain('POST /auth/login/two-factor')
})

it('a login without 2FA still logs in at once (control)', async () => {
  const plain = { ...ACCOUNT, two_factor_enabled: false }
  installFakeBackend({ 'POST /auth/login': () => ({ status: 200, data: { data: plain } }) })
  const client = new QueryClient()
  client.setQueryData(['account'], null)
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    </QueryClientProvider>,
  )

  fireEvent.change(screen.getByLabelText('Játékosnév'), { target: { value: 'Steve_01' } })
  fireEvent.change(screen.getByLabelText('Jelszó'), { target: { value: 'titkos-jelszo' } })
  fireEvent.click(screen.getByRole('button', { name: 'Belépés' }))

  await waitFor(() => expect(client.getQueryData(['account'])).toEqual(plain))
  expect(screen.queryByRole('heading', { name: 'Kétlépcsős azonosítás' })).toBeNull()
})
