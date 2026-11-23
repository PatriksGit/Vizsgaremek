/**
 * Regression test (frontend review 2026-11-23).
 * AUTH-2: "Vissza a jelszóhoz" stays clickable while the authenticator
 * code is being checked. The late answer lands on the code form that was just
 * left: the next code step opens with the old "Hibás kód" before anything is typed,
 * and the first code typed there is silently not sent while the old one is still on its way.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, expect, it } from 'vitest'

import { LoginForm } from '@/features/auth/LoginForm'
import { installFakeBackend, stubBrowserApis, type Reply } from '@/test/fakeBackend'

const WRONG = 'Hibás kód. Nézd meg újra az alkalmazásban, a kód 30 másodpercenként változik.'
const wrongCode: Reply = { status: 422, data: { message: WRONG, code: 'validation_failed', errors: { code: [WRONG] } } }

beforeAll(stubBrowserApis)
afterEach(cleanup)

function renderLogin() {
  let answerCode: ((reply: Reply) => void) | null = null
  const calls = installFakeBackend({
    'POST /auth/login': () => ({ status: 202, data: { data: { two_factor_required: true } } }),
    'POST /auth/login/two-factor': () => new Promise<Reply>((resolve) => (answerCode = resolve)),
  })
  const client = new QueryClient()
  client.setQueryData(['account'], null)
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return {
    /** How many codes went to the backend. */
    codesSent: () => calls.filter((call) => call === 'POST /auth/login/two-factor').length,
    /** The code is on its way to the backend (a slow network: the answer has not come yet). */
    codeSent: () => waitFor(() => expect(answerCode).not.toBeNull()),
    answer: (reply: Reply) => act(async () => answerCode?.(reply)),
  }
}

async function givePassword() {
  fireEvent.change(screen.getByLabelText('Játékosnév'), { target: { value: 'Steve_01' } })
  fireEvent.change(screen.getByLabelText('Jelszó'), { target: { value: 'titkos-jelszo' } })
  fireEvent.click(screen.getByRole('button', { name: 'Belépés' }))
  await screen.findByRole('heading', { name: 'Kétlépcsős azonosítás' })
}

const typeCode = (code: string) => fireEvent.change(screen.getByLabelText('Kód az alkalmazásból'), { target: { value: code } })
const backToPassword = () => fireEvent.click(screen.getByRole('button', { name: 'Vissza a jelszóhoz' }))

it('repro: back while the code is checked, the late "wrong code" shows on the next code step', async () => {
  const backend = renderLogin()
  await givePassword()
  typeCode('111111')
  await backend.codeSent()

  backToPassword()
  await backend.answer(wrongCode)
  await givePassword()

  expect(screen.queryByText(WRONG)).toBeNull()
})

it('control: back after the answer came, the next code step is clean', async () => {
  const backend = renderLogin()
  await givePassword()
  typeCode('111111')
  await backend.codeSent()

  await backend.answer(wrongCode)
  expect(await screen.findByText(WRONG)).toBeTruthy()
  backToPassword()
  await givePassword()

  expect(screen.queryByText(WRONG)).toBeNull()
})

it('repro: back while the code is checked, the code typed on the next code step still goes out', async () => {
  const backend = renderLogin()
  await givePassword()
  typeCode('111111')
  await backend.codeSent()

  backToPassword()
  await givePassword()
  // The new step takes a code at once: nothing on it waits for the old answer.
  expect((screen.getByLabelText('Kód az alkalmazásból') as HTMLInputElement).disabled).toBe(false)
  expect((screen.getByRole('button', { name: 'Belépés' }) as HTMLButtonElement).disabled).toBe(false)
  typeCode('222222')

  await waitFor(() => expect(backend.codesSent()).toBe(2))
})
