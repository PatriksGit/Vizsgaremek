/**
 * Regression test (frontend review 2026-11-23).
 * AM-7: the app's rule (src/queryClient.ts): "Any request answered with 401 means the session is
 * gone: forget the account, and the guards send the player to login". It lives in the Query and
 * Mutation caches, but PasswordRow (changePassword) and both 2FA code dialogs (enableTwoFactor,
 * disableTwoFactor) call the API directly, so their 401 (the session ended meanwhile: e.g. a password
 * change on another device ends every other session) only puts "Ehhez be kell jelentkezned." on the
 * form and leaves the player on a page that still shows them logged in.
 * Uses the app's own queryClient.
 */
import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'

import { AccountPage } from '@/features/account/AccountPage'
import { RequireAccount } from '@/features/auth/guards'
import { queryClient } from '@/queryClient'
import { installFakeBackend, stubBrowserApis, type Reply } from '@/test/fakeBackend'

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', async (importOriginal) => ({ ...(await importOriginal<typeof import('sonner')>()), toast: toastMock }))
vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn(async (url: string) => `data:image/png;base64,${btoa(url)}`) } }))

const ACCOUNT = {
  uuid: 'u-1',
  username: 'steve_01',
  display_name: 'Steve_01',
  email: 'steve@example.com',
  two_factor_enabled: false,
  can_manage: false,
  registered_at: '2026-01-01T00:00:00Z',
}
const GONE: Reply = { status: 401, data: { message: 'Ehhez be kell jelentkezned.', code: 'unauthenticated' } }

beforeAll(stubBrowserApis)
afterEach(() => {
  cleanup()
  queryClient.clear()
  vi.clearAllMocks()
})

const SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'
const SETUP: Reply = { status: 200, data: { data: { secret: SECRET, otpauth_url: `otpauth://totp/RuneEmpire:Steve_01?secret=${SECRET}` } } }

function renderPage(password: Reply = GONE, { account = ACCOUNT, setup = GONE }: { account?: typeof ACCOUNT; setup?: Reply } = {}) {
  installFakeBackend({
    'GET /auth/me': () => ({ status: 200, data: { data: account } }),
    'PUT /auth/password': () => password,
    'POST /auth/two-factor/setup': () => setup,
    'POST /auth/two-factor/enable': () => GONE,
    'POST /auth/two-factor/disable': () => GONE,
  })
  queryClient.setQueryData(['account'], account)
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/beallitasok']}>
        <Routes>
          <Route path="beallitasok" element={<RequireAccount><AccountPage /></RequireAccount>} />
          <Route path="login" element={<h1>Belépés</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const type = (name: string, value: string) => fireEvent.change(screen.getByLabelText(name), { target: { value } })

function changePassword() {
  fireEvent.click(screen.getByRole('button', { name: 'Jelszó módosítása' }))
  type('Jelenlegi jelszó', 'regi-jelszo')
  type('Új jelszó', 'uj-jelszo-1')
  type('Új jelszó újra', 'uj-jelszo-1')
  fireEvent.click(screen.getByRole('button', { name: 'Mentés' }))
}

it('repro: a 401 on the password change forgets the account, like every other request', async () => {
  renderPage()
  changePassword()

  // The guard sends the player to log in, as after any other 401.
  expect(await screen.findByRole('heading', { name: 'Belépés' })).toBeTruthy()
})

it('control: the same change answered 204 keeps the player on the page and says so', async () => {
  renderPage({ status: 204 })
  changePassword()

  await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Megváltozott a jelszavad. A többi eszközödről kijelentkeztettünk.'))
  expect(screen.getByRole('heading', { level: 1, name: 'Beállítások' })).toBeTruthy()
  expect(queryClient.getQueryData(['account'])).not.toBeNull()
})

it('control path2: a 401 on the 2FA setup (a useMutation) forgets the account', async () => {
  renderPage()
  fireEvent.click(within(screen.getByRole('region', { name: 'Kétlépcsős azonosítás' })).getByRole('button', { name: 'Bekapcsolás' }))

  expect(await screen.findByRole('heading', { name: 'Belépés' })).toBeTruthy()
})

// Done by hand for the two code dialogs (the review checked only PasswordRow): their codes go through a useMutation too.
it('a 401 on the 2FA switch-on code forgets the account', async () => {
  renderPage(GONE, { setup: SETUP })
  fireEvent.click(within(screen.getByRole('region', { name: 'Kétlépcsős azonosítás' })).getByRole('button', { name: 'Bekapcsolás' }))
  const dialog = await screen.findByRole('dialog', { name: 'Kétlépcsős azonosítás bekapcsolása' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Tovább' }))
  await within(dialog).findByText('JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Tovább' }))
  fireEvent.change(within(dialog).getByLabelText('Kód az alkalmazásból'), { target: { value: '123456' } })

  expect(await screen.findByRole('heading', { name: 'Belépés' })).toBeTruthy()
})

it('a 401 on the 2FA switch-off code forgets the account', async () => {
  renderPage(GONE, { account: { ...ACCOUNT, two_factor_enabled: true } })
  fireEvent.click(within(screen.getByRole('region', { name: 'Kétlépcsős azonosítás' })).getByRole('button', { name: 'Kikapcsolás' }))
  const dialog = await screen.findByRole('alertdialog', { name: 'Kétlépcsős azonosítás kikapcsolása' })
  fireEvent.change(within(dialog).getByLabelText('6 jegyű kód'), { target: { value: '654321' } })

  expect(await screen.findByRole('heading', { name: 'Belépés' })).toBeTruthy()
})
