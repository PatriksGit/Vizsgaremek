/**
 * Review 2026-11-24 AC-2: the server says 2FA is already in the other state (409 two_factor.not_enabled /
 * two_factor.already_enabled: another tab, or staff switched it off by hand). The dialog showed the
 * message, but the row's badge kept the stale state ("Bekapcsolva" while 2FA is off) until a later
 * /auth/me refetch: only a 204 writes the state into the cached account.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'

import { AccountPage } from '@/features/account/AccountPage'
import { installFakeBackend, stubBrowserApis, type Reply } from '@/test/fakeBackend'

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', async (importOriginal) => ({ ...(await importOriginal<typeof import('sonner')>()), toast: toastMock }))
vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn(async (url: string) => `data:image/png;base64,${btoa(url)}`) } }))

const ACCOUNT = {
  uuid: 'u-1',
  username: 'steve_01',
  display_name: 'Steve_01',
  email: 'steve@example.com',
  two_factor_enabled: true,
  can_manage: false,
  registered_at: '2026-01-01T00:00:00Z',
}

const NOT_ENABLED: Reply = { status: 409, data: { message: 'A kétlépcsős azonosítás nincs bekapcsolva.', code: 'two_factor.not_enabled' } }

beforeAll(stubBrowserApis)
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderPage(enabled: boolean, routes: Record<string, () => Reply>) {
  const account = { ...ACCOUNT, two_factor_enabled: enabled }
  installFakeBackend({ 'GET /auth/me': () => ({ status: 200, data: { data: account } }), ...routes })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  client.setQueryData(['account'], account)
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AccountPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// hidden: an open modal dialog hides the page from the accessibility tree.
const card = () => within(screen.getByRole('region', { name: 'Kétlépcsős azonosítás', hidden: true }))

async function switchOffWithCode() {
  fireEvent.click(card().getByRole('button', { name: 'Kikapcsolás' }))
  const dialog = await screen.findByRole('alertdialog', { name: 'Kétlépcsős azonosítás kikapcsolása' })
  fireEvent.change(within(dialog).getByLabelText('6 jegyű kód'), { target: { value: '123456' } })
  return dialog
}

it('"nincs bekapcsolva" from the server switches the badge to Kikapcsolva', async () => {
  renderPage(true, { 'POST /auth/two-factor/disable': () => NOT_ENABLED })
  const dialog = await switchOffWithCode()
  await within(dialog).findByText('A kétlépcsős azonosítás nincs bekapcsolva.')

  expect(card().queryByText('Kikapcsolva')).not.toBeNull()
})

it('control: a switch-off the server accepts switches the badge to Kikapcsolva', async () => {
  renderPage(true, { 'POST /auth/two-factor/disable': () => ({ status: 204 }) })
  await switchOffWithCode()

  await waitFor(() => expect(card().queryByText('Kikapcsolva')).not.toBeNull())
})
