/**
 * Regression test (frontend review 2026-11-23).
 * AM-3 path4: the same late answer in PasswordRow. Mégse while Mentés is on its way empties and
 * closes the form; the late 422 then puts "A jelenlegi jelszó hibás." on the closed (inert, still
 * mounted) form, and the next "Jelszó módosítása" opens empty fields with that error under them.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'

import { AccountPage } from '@/features/account/AccountPage'
import { installFakeBackend, stubBrowserApis, type Reply } from '@/test/fakeBackend'

const WRONG = 'A jelenlegi jelszó hibás.'
const ACCOUNT = {
  uuid: 'u-1',
  username: 'steve_01',
  display_name: 'Steve_01',
  email: 'steve@example.com',
  two_factor_enabled: false,
  can_manage: false,
  registered_at: '2026-01-01T00:00:00Z',
}

beforeAll(stubBrowserApis)
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderPage() {
  let release: ((reply: Reply) => void) | null = null
  installFakeBackend({
    'GET /auth/me': () => ({ status: 200, data: { data: ACCOUNT } }),
    'PUT /auth/password': () => new Promise<Reply>((resolve) => (release = resolve)),
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['account'], ACCOUNT)
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AccountPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return {
    answer: async (reply: Reply) => {
      await waitFor(() => expect(release).not.toBeNull())
      release?.(reply)
    },
  }
}

const type = (name: string, value: string) => fireEvent.change(screen.getByLabelText(name), { target: { value } })
const wrong: Reply = { status: 422, data: { message: WRONG, code: 'validation_failed', errors: { current_password: [WRONG] } } }

async function fillAndSave() {
  fireEvent.click(screen.getByRole('button', { name: 'Jelszó módosítása' }))
  type('Jelenlegi jelszó', 'regi-jelszo')
  type('Új jelszó', 'uj-jelszo-1')
  type('Új jelszó újra', 'uj-jelszo-1')
  fireEvent.click(screen.getByRole('button', { name: 'Mentés' }))
  await screen.findByRole('button', { name: 'Mentés…' })
}

it('repro path4: a late refusal after Mégse is not shown when the form opens again', async () => {
  const { answer } = renderPage()
  await fillAndSave()
  fireEvent.click(screen.getByRole('button', { name: 'Mégse' }))

  await answer(wrong)
  await new Promise((resolve) => setTimeout(resolve, 100))

  fireEvent.click(screen.getByRole('button', { name: 'Jelszó módosítása' }))
  expect((screen.getByLabelText('Jelenlegi jelszó') as HTMLInputElement).value).toBe('')
  expect(screen.queryByText(WRONG)).toBeNull()
})

it('control path4: a refusal with the form open is shown on its field', async () => {
  const { answer } = renderPage()
  await fillAndSave()

  await answer(wrong)

  expect(await screen.findByText(WRONG)).toBeTruthy()
})
