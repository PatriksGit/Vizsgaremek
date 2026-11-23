/**
 * Regression test (frontend review 2026-11-23).
 * AM-3 path3: the same late answer in TwoFactorDisableDialog. Closed (Mégse, Esc) while the
 * code is checked, the dialog resets on close; the late 422 then puts "Hibás kód…" on the
 * closed form, and the next opening greets the player with that error before they typed anything.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'

import { AccountPage } from '@/features/account/AccountPage'
import { installFakeBackend, stubBrowserApis, type Reply } from '@/test/fakeBackend'

const WRONG = 'Hibás kód. Nézd meg újra az alkalmazásban, a kód 30 másodpercenként változik.'
const ACCOUNT = {
  uuid: 'u-1',
  username: 'steve_01',
  display_name: 'Steve_01',
  email: 'steve@example.com',
  two_factor_enabled: true,
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
    'POST /auth/two-factor/disable': () => new Promise<Reply>((resolve) => (release = resolve)),
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  client.setQueryData(['account'], ACCOUNT)
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AccountPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return {
    answerDisable: async (reply: Reply) => {
      await waitFor(() => expect(release).not.toBeNull())
      release?.(reply)
    },
  }
}

const card = () => within(screen.getByRole('region', { name: 'Kétlépcsős azonosítás' }))
const wrongCode: Reply = { status: 422, data: { message: WRONG, code: 'validation_failed', errors: { code: [WRONG] } } }

async function openAndTypeCode() {
  fireEvent.click(card().getByRole('button', { name: 'Kikapcsolás' }))
  const dialog = await screen.findByRole('alertdialog', { name: 'Kétlépcsős azonosítás kikapcsolása' })
  fireEvent.change(within(dialog).getByLabelText('6 jegyű kód'), { target: { value: '111111' } })
  await within(dialog).findByRole('button', { name: 'Kikapcsolás…' })
  return dialog
}

it('repro path3: a late wrong-code answer after closing is not shown on the next opening', async () => {
  const { answerDisable } = renderPage()
  const dialog = await openAndTypeCode()
  fireEvent.keyDown(dialog, { key: 'Escape' })
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())

  await answerDisable(wrongCode)
  await new Promise((resolve) => setTimeout(resolve, 100))

  fireEvent.click(card().getByRole('button', { name: 'Kikapcsolás' }))
  const again = await screen.findByRole('alertdialog')
  expect(within(again).queryByText(WRONG)).toBeNull()
})

it('control path3: a wrong code with the dialog open says why', async () => {
  const { answerDisable } = renderPage()
  const dialog = await openAndTypeCode()

  await answerDisable(wrongCode)

  expect(await within(dialog).findByText(WRONG)).toBeTruthy()
})
