/**
 * Review 2026-11-24 AC-2 (path 2: the setup's 409 two_factor.already_enabled): the server says 2FA is already in the other state (409 two_factor.not_enabled /
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

const ALREADY_ENABLED: Reply = { status: 409, data: { message: 'A kétlépcsős azonosítás már be van kapcsolva.', code: 'two_factor.already_enabled' } }

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

it('"már be van kapcsolva" on the setup switches the badge to Bekapcsolva', async () => {
  renderPage(false, { 'POST /auth/two-factor/setup': () => ALREADY_ENABLED })
  fireEvent.click(card().getByRole('button', { name: 'Bekapcsolás' }))
  const dialog = await screen.findByRole('dialog', { name: 'Kétlépcsős azonosítás bekapcsolása' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Tovább' }))
  await within(dialog).findByText('A kétlépcsős azonosítás már be van kapcsolva.')

  expect(card().queryByText('Bekapcsolva')).not.toBeNull()
})

it('control: a setup the server accepts, then the right code, switches the badge to Bekapcsolva', async () => {
  renderPage(false, {
    'POST /auth/two-factor/setup': () => ({ status: 200, data: { data: { secret: 'JBSWY3DPEHPK3PXP', otpauth_url: 'otpauth://totp/x?secret=JBSWY3DPEHPK3PXP' } } }),
    'POST /auth/two-factor/enable': () => ({ status: 204 }),
  })
  fireEvent.click(card().getByRole('button', { name: 'Bekapcsolás' }))
  const dialog = await screen.findByRole('dialog', { name: 'Kétlépcsős azonosítás bekapcsolása' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Tovább' }))
  await within(dialog).findByText('JBSW Y3DP EHPK 3PXP')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Tovább' }))
  fireEvent.change(within(dialog).getByLabelText('Kód az alkalmazásból'), { target: { value: '123456' } })

  await waitFor(() => expect(card().queryByText('Bekapcsolva')).not.toBeNull())
})
