/**
 * Switching 2FA on and off on the Beállítások page (the owner's design, 2026-11-22).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'

import { AccountPage } from '@/features/account/AccountPage'
import { installFakeBackend, stubBrowserApis, type Handler } from '@/test/fakeBackend'

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', async (importOriginal) => ({ ...(await importOriginal<typeof import('sonner')>()), toast: toastMock }))
// jsdom has no canvas: the QR image is a stand-in that shows which address it encodes.
vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn(async (url: string) => `data:image/png;base64,${btoa(url)}`) } }))

const SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'
const OTPAUTH = `otpauth://totp/RuneEmpire:Steve_01?secret=${SECRET}&issuer=RuneEmpire&algorithm=SHA1&digits=6&period=30`
const WRONG = 'Hibás kód. Nézd meg újra az alkalmazásban, a kód 30 másodpercenként változik.'

const account = (twoFactor: boolean) => ({
  uuid: 'u-1',
  username: 'steve_01',
  display_name: 'Steve_01',
  email: 'steve@example.com',
  two_factor_enabled: twoFactor,
  registered_at: '2026-01-01T00:00:00Z',
})

beforeAll(stubBrowserApis)
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderPage(twoFactor: boolean, routes: Record<string, Handler> = {}) {
  const calls = installFakeBackend({
    'GET /auth/me': () => ({ status: 200, data: { data: account(twoFactor) } }),
    'POST /auth/two-factor/setup': () => ({ status: 200, data: { data: { secret: SECRET, otpauth_url: OTPAUTH } } }),
    'POST /auth/two-factor/enable': () => ({ status: 204 }),
    'POST /auth/two-factor/disable': () => ({ status: 204 }),
    ...routes,
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  client.setQueryData(['account'], account(twoFactor))
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AccountPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { calls, client }
}

const card = () => within(screen.getByRole('region', { name: 'Kétlépcsős azonosítás' }))
const next = (dialog: HTMLElement) => fireEvent.click(within(dialog).getByRole('button', { name: 'Tovább' }))

it('shows it off, with the way to switch it on', () => {
  renderPage(false)

  expect(card().getByText('Kikapcsolva')).toBeTruthy()
  expect(card().getByRole('button', { name: 'Bekapcsolás' })).toBeTruthy()
})

it('step 1 offers three apps, each with its App Store and Google Play listing', async () => {
  renderPage(false)

  fireEvent.click(card().getByRole('button', { name: 'Bekapcsolás' }))
  const dialog = await screen.findByRole('dialog', { name: 'Kétlépcsős azonosítás bekapcsolása' })

  expect(within(dialog).getByRole('heading', { name: 'Telepíts egy hitelesítő alkalmazást' })).toBeTruthy()
  const google = within(dialog).getByRole('link', { name: 'Google Authenticator letöltése: Android' })
  expect(google.getAttribute('href')).toBe('https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2')
  expect(google.getAttribute('rel')).toBe('noopener noreferrer')
  expect(within(dialog).getByRole('link', { name: 'Proton Authenticator letöltése: iPhone' })).toBeTruthy()
  expect(within(dialog).getByRole('link', { name: 'Microsoft Authenticator letöltése: iPhone' })).toBeTruthy()
})

it('switching on goes app → QR code and key → code, and the right code turns it on', async () => {
  const { client } = renderPage(false)

  fireEvent.click(card().getByRole('button', { name: 'Bekapcsolás' }))
  const dialog = await screen.findByRole('dialog', { name: 'Kétlépcsős azonosítás bekapcsolása' })
  next(dialog)

  const qr = (await within(dialog).findByAltText('QR-kód a hitelesítő alkalmazáshoz')) as HTMLImageElement
  expect(atob(qr.src.split(',')[1])).toBe(OTPAUTH)
  expect(within(dialog).getByText('JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP')).toBeTruthy()
  // On a phone the app opens the address itself: a plain link, not a button.
  expect(within(dialog).getByRole('link', { name: 'Megnyitás az alkalmazásban' }).getAttribute('href')).toBe(OTPAUTH)
  next(dialog)

  fireEvent.change(within(dialog).getByLabelText('Kód az alkalmazásból'), { target: { value: '123456' } })

  expect(await screen.findByRole('heading', { name: 'Kétlépcsős azonosítás bekapcsolva' })).toBeTruthy()
  expect(client.getQueryData<{ two_factor_enabled: boolean }>(['account'])?.two_factor_enabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Kész' }))
  await waitFor(() => expect(card().getByText('Bekapcsolva')).toBeTruthy())
})

it('a wrong code keeps it off and says why', async () => {
  const { client } = renderPage(false, {
    'POST /auth/two-factor/enable': () => ({ status: 422, data: { message: WRONG, code: 'validation_failed', errors: { code: [WRONG] } } }),
  })

  fireEvent.click(card().getByRole('button', { name: 'Bekapcsolás' }))
  const dialog = await screen.findByRole('dialog')
  next(dialog)
  await within(dialog).findByText('JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP')
  next(dialog)
  fireEvent.change(within(dialog).getByLabelText('Kód az alkalmazásból'), { target: { value: '111111' } })

  expect(await within(dialog).findByText(WRONG)).toBeTruthy()
  expect(client.getQueryData<{ two_factor_enabled: boolean }>(['account'])?.two_factor_enabled).toBe(false)
})

it('without a key on the server the dialog says it is not available', async () => {
  renderPage(false, {
    'POST /auth/two-factor/setup': () => ({
      status: 503,
      data: { message: 'A kétlépcsős azonosítás most nem érhető el, próbáld újra később.', code: 'two_factor.unavailable' },
    }),
  })

  fireEvent.click(card().getByRole('button', { name: 'Bekapcsolás' }))
  next(await screen.findByRole('dialog'))

  expect(await screen.findByText('A kétlépcsős azonosítás most nem érhető el, próbáld újra később.')).toBeTruthy()
  expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Tovább' }).hasAttribute('disabled')).toBe(true)
})

/**
 * Found in the browser (2026-11-22): React reused the Tovább button as the
 * Bekapcsolás submit button, so in Chrome its own click submitted the empty
 * form and the code step opened with "Írd be mind a 6 számjegyet.". jsdom does
 * not submit there, so this checks the cause: the submit button must be a new
 * element, not the Tovább button changed in place.
 */
it("the code step's submit button is a new element, not the reused Tovább button", async () => {
  const { calls } = renderPage(false)

  fireEvent.click(card().getByRole('button', { name: 'Bekapcsolás' }))
  const dialog = await screen.findByRole('dialog')
  next(dialog)
  await within(dialog).findByText('JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP')
  const tovabb = within(dialog).getByRole('button', { name: 'Tovább' })
  fireEvent.click(tovabb)

  expect(await within(dialog).findByRole('heading', { name: 'Írd be a kódot' })).toBeTruthy()
  expect(within(dialog).getByRole('button', { name: 'Bekapcsolás' })).not.toBe(tovabb)
  expect(tovabb.isConnected).toBe(false)
  expect(within(dialog).queryByText(/számjegyet/)).toBeNull()
  expect(calls).not.toContain('POST /auth/two-factor/enable')
})

it('switching off asks for a code, then shows it off', async () => {
  const { calls, client } = renderPage(true)
  expect(card().getByText('Bekapcsolva')).toBeTruthy()

  fireEvent.click(card().getByRole('button', { name: 'Kikapcsolás' }))
  const dialog = await screen.findByRole('alertdialog', { name: 'Kétlépcsős azonosítás kikapcsolása' })
  fireEvent.change(within(dialog).getByLabelText('6 jegyű kód'), { target: { value: '123456' } })

  await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('A kétlépcsős azonosítás kikapcsolva.'))
  expect(calls).toContain('POST /auth/two-factor/disable')
  expect(client.getQueryData<{ two_factor_enabled: boolean }>(['account'])?.two_factor_enabled).toBe(false)
})
