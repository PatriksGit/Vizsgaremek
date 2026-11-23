/**
 * The Beállítások page (owner's design "Asztali/Mobil – Beállítások", 2026-11-22):
 * the account's details and the password change against PUT /api/auth/password.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'

import { AccountPage } from '@/features/account/AccountPage'
import { PASSWORD_EXAMPLE } from '@/features/auth/schemas'
import { installFakeBackend, stubBrowserApis, type Handler } from '@/test/fakeBackend'

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', async (importOriginal) => ({ ...(await importOriginal<typeof import('sonner')>()), toast: toastMock }))

const ACCOUNT = {
  uuid: 'u-1',
  username: 'steve_01',
  display_name: 'Steve_01',
  email: 'steve@example.com',
  registered_at: '2026-01-01T00:00:00Z',
}

beforeAll(stubBrowserApis)
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderPage(changePassword: Handler = () => ({ status: 204 })) {
  const bodies: unknown[] = []
  const calls = installFakeBackend({
    'GET /auth/me': () => ({ status: 200, data: { data: ACCOUNT } }),
    'PUT /auth/password': (config) => {
      bodies.push(JSON.parse(config.data as string))
      return changePassword(config)
    },
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
  return { calls, bodies }
}

const field = (name: string) => screen.getByLabelText(name) as HTMLInputElement
const type = (name: string, value: string) => fireEvent.change(field(name), { target: { value } })
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Mentés' }))
/** The password form opens under its row (owner, 2026-11-22). */
const openPasswordForm = () => fireEvent.click(screen.getByRole('button', { name: 'Jelszó módosítása' }))
/** The form stays in the page so it can slide; closed, it is inert (no Tab, no screen reader). */
const passwordFormOpen = () => field('Jelenlegi jelszó').closest('[inert]') === null

function fillAll(current = 'regi-jelszo', next = 'uj-jelszo-1', again = next) {
  type('Jelenlegi jelszó', current)
  type('Új jelszó', next)
  type('Új jelszó újra', again)
}

it('shows the player on top: the name and the own e-mail address', () => {
  renderPage()

  const profile = screen.getByRole('region', { name: 'Profil' })
  expect(within(profile).getByText('Steve_01')).toBeTruthy()
  expect(within(profile).getByText('steve@example.com')).toBeTruthy()
  expect(screen.getByRole('heading', { level: 1, name: 'Beállítások' })).toBeTruthy()
  expect(document.title).toBe('Beállítások | RuneEmpire')
})

it('keeps the password form closed until "Jelszó módosítása", and Mégse closes it empty', () => {
  renderPage()

  expect(passwordFormOpen()).toBe(false)
  openPasswordForm()
  expect(passwordFormOpen()).toBe(true)
  type('Jelenlegi jelszó', 'regi-jelszo')
  fireEvent.click(screen.getByRole('button', { name: 'Mégse' }))

  expect(passwordFormOpen()).toBe(false)
  openPasswordForm()
  expect(field('Jelenlegi jelszó').value).toBe('')
})

it('links a forgotten current password to the reset panel', () => {
  renderPage()
  openPasswordForm()

  expect(screen.getByRole('link', { name: 'Elfelejtetted?' }).getAttribute('href')).toBe('/forgot-password')
})

it('ticks the site\'s real password rules while typing, read with the field', () => {
  renderPage()
  openPasswordForm()

  type('Új jelszó', 'jelszó 1')
  const rules = field('Új jelszó').getAttribute('aria-describedby')!
  const hint = document.getElementById(rules)!.textContent
  expect(hint).toContain('8–64 karakter – teljesül')
  expect(hint).toContain('Szóköz nélkül – még nem teljesül')
  expect(hint).toContain(`Magyar vagy angol betűk, számok, alap jelek ${PASSWORD_EXAMPLE} – teljesül`)
  // What saving does to the other devices is said there too (owner, 2026-11-22: not in a footer).
  expect(hint).toContain('Mentés után kijelentkeztetünk a többi eszközről.')

  type('Új jelszó', 'jelszó€12')
  expect(document.getElementById(rules)!.textContent).toContain(`alap jelek ${PASSWORD_EXAMPLE} – még nem teljesül`)
})

it('sends the passwords, then closes the form and says the other devices were logged out', async () => {
  const { bodies } = renderPage()
  openPasswordForm()

  fillAll()
  submit()

  await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Megváltozott a jelszavad. A többi eszközödről kijelentkeztettünk.'))
  expect(bodies).toEqual([{ current_password: 'regi-jelszo', password: 'uj-jelszo-1', password_confirmation: 'uj-jelszo-1' }])
  expect(passwordFormOpen()).toBe(false)
  openPasswordForm()
  expect([field('Jelenlegi jelszó').value, field('Új jelszó').value, field('Új jelszó újra').value]).toEqual(['', '', ''])
})

it('puts a wrong current password on its field', async () => {
  renderPage(() => ({
    status: 422,
    data: { message: 'A jelenlegi jelszó hibás.', code: 'validation_failed', errors: { current_password: ['A jelenlegi jelszó hibás.'] } },
  }))
  openPasswordForm()

  fillAll()
  submit()

  await waitFor(() => expect(field('Jelenlegi jelszó').getAttribute('aria-invalid')).toBe('true'))
  expect(screen.getByText('A jelenlegi jelszó hibás.')).toBeTruthy()
  expect(toastMock.success).not.toHaveBeenCalled()
})

it('shows a refusal without a field (too many tries) on the form', async () => {
  renderPage(() => ({ status: 429, data: { message: 'Túl sok próbálkozás. Próbáld újra később.', code: 'too_many_requests' } }))
  openPasswordForm()

  fillAll()
  submit()

  expect((await screen.findByRole('alert')).textContent).toBe('Túl sok próbálkozás. Próbáld újra később.')
})

it('catches mistakes before a request: two different new passwords, or the same as the current one', async () => {
  const { calls } = renderPage()
  openPasswordForm()

  fillAll('regi-jelszo', 'uj-jelszo-1', 'uj-jelszo-2')
  submit()
  expect(await screen.findByText('A két jelszó nem egyezik.')).toBeTruthy()

  fillAll('ugyanaz-123', 'ugyanaz-123')
  submit()
  expect(await screen.findByText('Az új jelszó nem lehet ugyanaz, mint a jelenlegi.')).toBeTruthy()

  expect(calls).not.toContain('PUT /auth/password')
})
