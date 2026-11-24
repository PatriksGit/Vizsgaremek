/**
 * Review 2026-11-24 AC-4 (path 2: Mentés): Mégse or Mentés closed the password form, which turned inert with the focused button (or field)
 * inside it; nothing gave the keyboard back to "Jelszó módosítása". In Chrome the focus fell to <body>
 * (Playwright, see the report); jsdom has no inert focus fix-up, so here the focus simply stayed on the
 * closed form's element instead of the toggle.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'

import { AccountPage } from '@/features/account/AccountPage'
import { installFakeBackend, stubBrowserApis } from '@/test/fakeBackend'

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', async (importOriginal) => ({ ...(await importOriginal<typeof import('sonner')>()), toast: toastMock }))

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
  installFakeBackend({
    'GET /auth/me': () => ({ status: 200, data: { data: ACCOUNT } }),
    'PUT /auth/password': () => ({ status: 204 }),
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
}

async function openForm() {
  const toggle = screen.getByRole('button', { name: 'Jelszó módosítása' })
  toggle.focus()
  fireEvent.click(toggle)
  await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Jelenlegi jelszó')))
}

it('a saved password gives the keyboard back to "Jelszó módosítása"', async () => {
  renderPage()
  await openForm()
  fireEvent.change(screen.getByLabelText('Jelenlegi jelszó'), { target: { value: 'Regi-Jelszo-1' } })
  fireEvent.change(screen.getByLabelText('Új jelszó'), { target: { value: 'Uj-Jelszo-2026' } })
  const again = screen.getByLabelText('Új jelszó újra')
  fireEvent.change(again, { target: { value: 'Uj-Jelszo-2026' } })
  again.focus()
  fireEvent.submit(again.closest('form')!)

  await waitFor(() => expect(toastMock.success).toHaveBeenCalled())
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Jelszó módosítása' })).not.toBeNull())
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Jelszó módosítása' }))
})

it('control: a refused save keeps the form open with the keyboard in it', async () => {
  renderPage()
  await openForm()
  // The new password is the current one: the schema refuses it before any request.
  for (const label of ['Jelenlegi jelszó', 'Új jelszó', 'Új jelszó újra']) fireEvent.change(screen.getByLabelText(label), { target: { value: 'Uj-Jelszo-2026' } })
  fireEvent.submit(screen.getByLabelText('Új jelszó újra').closest('form')!)

  await waitFor(() => expect(document.activeElement?.closest('form')).not.toBeNull())
  expect(screen.queryByRole('button', { name: 'Jelszó módosítása' })).toBeNull()
})
