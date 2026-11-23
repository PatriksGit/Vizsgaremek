/**
 * Regression test (frontend review 2026-11-23).
 * AM-3: the 2FA setup dialog closed (Esc, the X, a tap beside it) while the code is being
 * checked. The dialog resets on close, then the late answer sets done = true on the closed,
 * still-mounted dialog. Switching 2FA off and on again later opens straight on the
 * "Kétlépcsős azonosítás bekapcsolva" success screen, while 2FA is off.
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

const SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'
const OTPAUTH = `otpauth://totp/RuneEmpire:Steve_01?secret=${SECRET}&issuer=RuneEmpire`
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
  let release: (reply: Reply) => void = () => {}
  installFakeBackend({
    'GET /auth/me': () => ({ status: 200, data: { data: ACCOUNT } }),
    'POST /auth/two-factor/setup': () => ({ status: 200, data: { data: { secret: SECRET, otpauth_url: OTPAUTH } } }),
    // The code check is slow: the test decides when it answers.
    'POST /auth/two-factor/enable': () => new Promise<Reply>((resolve) => (release = resolve)),
    'POST /auth/two-factor/disable': () => ({ status: 204 }),
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
  return { answerEnable: () => release({ status: 204 }) }
}

const card = () => within(screen.getByRole('region', { name: 'Kétlépcsős azonosítás' }))

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

async function switchOffThenOpenSetupAgain() {
  await waitFor(() => expect(card().getByText('Bekapcsolva')).toBeTruthy())
  fireEvent.click(card().getByRole('button', { name: 'Kikapcsolás' }))
  const off = await screen.findByRole('alertdialog', { name: 'Kétlépcsős azonosítás kikapcsolása' })
  fireEvent.change(within(off).getByLabelText('6 jegyű kód'), { target: { value: '654321' } })
  await waitFor(() => expect(card().getByText('Kikapcsolva')).toBeTruthy())
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())

  fireEvent.click(card().getByRole('button', { name: 'Bekapcsolás' }))
  return screen.findByRole('dialog')
}

it('repro: closing the setup while the code is checked does not leave a success screen for the next setup', async () => {
  const { answerEnable } = renderPage()
  const dialog = await openSetupAndTypeCode()

  fireEvent.keyDown(dialog, { key: 'Escape' })
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  answerEnable()

  const again = await switchOffThenOpenSetupAgain()
  expect(within(again).queryByRole('heading', { name: 'Kétlépcsős azonosítás bekapcsolva' })).toBeNull()
  expect(within(again).getByRole('heading', { name: 'Telepíts egy hitelesítő alkalmazást' })).toBeTruthy()
})

it('control: a setup finished with Kész starts over at step 1 next time', async () => {
  const { answerEnable } = renderPage()
  await openSetupAndTypeCode()
  answerEnable()
  fireEvent.click(await screen.findByRole('button', { name: 'Kész' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

  const again = await switchOffThenOpenSetupAgain()
  expect(within(again).queryByRole('heading', { name: 'Kétlépcsős azonosítás bekapcsolva' })).toBeNull()
  expect(within(again).getByRole('heading', { name: 'Telepíts egy hitelesítő alkalmazást' })).toBeTruthy()
})
