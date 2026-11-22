/**
 * The Beállítások page (owner's design "Asztali/Mobil – Beállítások", 2026-11-22):
 * the account's details and the password change against PUT /api/auth/password.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'

import { AccountPage } from '@/features/account/AccountPage'
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
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Jelszó módosítása' }))

function fillAll(current = 'regi-jelszo', next = 'uj-jelszo-1', again = next) {
  type('Jelenlegi jelszó', current)
  type('Új jelszó', next)
  type('Új jelszó újra', again)
}

it('shows the name and the own e-mail address, which only staff can change', () => {
  renderPage()

  const details = screen.getByRole('region', { name: 'Fiókadatok' })
  expect(within(details).getByText('Steve_01')).toBeTruthy()
  expect(within(details).getByText('steve@example.com')).toBeTruthy()
  expect(within(details).getByText('A játékosnevet és az e-mail címet csak adminisztrátor módosíthatja.')).toBeTruthy()
  expect(document.title).toBe('Beállítások | RuneEmpire')
})

it('links a forgotten current password to the reset panel', () => {
  renderPage()

  expect(screen.getByRole('link', { name: 'Elfelejtetted?' }).getAttribute('href')).toBe('/forgot-password')
})

it('ticks the site\'s real password rules while typing, read with the field', () => {
  renderPage()

  type('Új jelszó', 'jelszó 1')
  const rules = field('Új jelszó').getAttribute('aria-describedby')!
  const hint = document.getElementById(rules)!.textContent
  expect(hint).toContain('8–64 karakter – teljesül')
  expect(hint).toContain('Szóköz nélkül – még nem teljesül')
  expect(hint).toContain('Magyar vagy angol betűk, számok, alap jelek (pl. ! @ # _ -) – teljesül')

  type('Új jelszó', 'jelszó€12')
  expect(document.getElementById(rules)!.textContent).toContain('alap jelek (pl. ! @ # _ -) – még nem teljesül')
})

it('sends the passwords, then empties the form and says the other devices were logged out', async () => {
  const { bodies } = renderPage()

  fillAll()
  submit()

  await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('Megváltozott a jelszavad. A többi eszközödről kijelentkeztettünk.'))
  expect(bodies).toEqual([{ current_password: 'regi-jelszo', password: 'uj-jelszo-1', password_confirmation: 'uj-jelszo-1' }])
  expect([field('Jelenlegi jelszó').value, field('Új jelszó').value, field('Új jelszó újra').value]).toEqual(['', '', ''])
})

it('puts a wrong current password on its field', async () => {
  renderPage(() => ({
    status: 422,
    data: { message: 'A jelenlegi jelszó hibás.', code: 'validation_failed', errors: { current_password: ['A jelenlegi jelszó hibás.'] } },
  }))

  fillAll()
  submit()

  await waitFor(() => expect(field('Jelenlegi jelszó').getAttribute('aria-invalid')).toBe('true'))
  expect(screen.getByText('A jelenlegi jelszó hibás.')).toBeTruthy()
  expect(toastMock.success).not.toHaveBeenCalled()
})

it('shows a refusal without a field (too many tries) on the form', async () => {
  renderPage(() => ({ status: 429, data: { message: 'Túl sok próbálkozás. Próbáld újra később.', code: 'too_many_requests' } }))

  fillAll()
  submit()

  expect((await screen.findByRole('alert')).textContent).toBe('Túl sok próbálkozás. Próbáld újra később.')
})

it('catches mistakes before a request: two different new passwords, or the same as the current one', async () => {
  const { calls } = renderPage()

  fillAll('regi-jelszo', 'uj-jelszo-1', 'uj-jelszo-2')
  submit()
  expect(await screen.findByText('A két jelszó nem egyezik.')).toBeTruthy()

  fillAll('ugyanaz-123', 'ugyanaz-123')
  submit()
  expect(await screen.findByText('Az új jelszó nem lehet ugyanaz, mint a jelenlegi.')).toBeTruthy()

  expect(calls).not.toContain('PUT /auth/password')
})
