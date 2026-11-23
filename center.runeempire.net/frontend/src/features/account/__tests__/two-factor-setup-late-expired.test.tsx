/**
 * Regression test (frontend review 2026-11-23).
 * AM-3 path2: the setup dialog closed while the code is checked, and the late answer is
 * auth.two_factor_expired. The closed dialog asks a new secret (POST /two-factor/setup with
 * nobody looking) and keeps step 2 with "A bekapcsolás lejárt…", so the next opening starts on
 * the QR step with an expiry error the player never caused, instead of at step 1.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'

import { AccountPage } from '@/features/account/AccountPage'
import { installFakeBackend, stubBrowserApis, type Reply } from '@/test/fakeBackend'

vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn(async (url: string) => `data:image/png;base64,${btoa(url)}`) } }))

const SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'
const OTPAUTH = `otpauth://totp/RuneEmpire:Steve_01?secret=${SECRET}&issuer=RuneEmpire`
const EXPIRED = 'A bekapcsolás lejárt, kezdd újra.'
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
  const calls = installFakeBackend({
    'GET /auth/me': () => ({ status: 200, data: { data: ACCOUNT } }),
    'POST /auth/two-factor/setup': () => ({ status: 200, data: { data: { secret: SECRET, otpauth_url: OTPAUTH } } }),
    'POST /auth/two-factor/enable': () => new Promise<Reply>((resolve) => (release = resolve)),
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
    calls,
    answerEnable: async (reply: Reply) => {
      await waitFor(() => expect(release).not.toBeNull())
      release?.(reply)
    },
  }
}

const card = () => within(screen.getByRole('region', { name: 'Kétlépcsős azonosítás' }))
const setupCalls = (calls: string[]) => calls.filter((call) => call === 'POST /auth/two-factor/setup').length

async function openSetupAndTypeCode() {
  fireEvent.click(card().getByRole('button', { name: 'Bekapcsolás' }))
  const dialog = await screen.findByRole('dialog', { name: 'Kétlépcsős azonosítás bekapcsolása' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Tovább' }))
  await within(dialog).findByText('JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Tovább' }))
  fireEvent.change(within(dialog).getByLabelText('Kód az alkalmazásból'), { target: { value: '123456' } })
  await within(dialog).findByRole('button', { name: 'Bekapcsolás…' })
  return dialog
}

it('repro path2: a late "expired" answer after closing neither asks a new secret nor leaves step 2 for the next opening', async () => {
  const { calls, answerEnable } = renderPage()
  const dialog = await openSetupAndTypeCode()
  fireEvent.keyDown(dialog, { key: 'Escape' })
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

  await answerEnable({ status: 422, data: { message: EXPIRED, code: 'auth.two_factor_expired' } })
  await new Promise((resolve) => setTimeout(resolve, 100))
  expect(setupCalls(calls)).toBe(1)

  fireEvent.click(card().getByRole('button', { name: 'Bekapcsolás' }))
  const again = await screen.findByRole('dialog')
  expect(within(again).getByRole('heading', { name: 'Telepíts egy hitelesítő alkalmazást' })).toBeTruthy()
  expect(within(again).queryByText(/lejárt/)).toBeNull()
})

it('control path2: an "expired" answer with the dialog open goes back to step 2 with a new secret', async () => {
  const { calls, answerEnable } = renderPage()
  const dialog = await openSetupAndTypeCode()

  await answerEnable({ status: 422, data: { message: EXPIRED, code: 'auth.two_factor_expired' } })

  expect(await within(dialog).findByText(`${EXPIRED} Olvasd be az új QR-kódot.`)).toBeTruthy()
  await waitFor(() => expect(setupCalls(calls)).toBe(2))
})
