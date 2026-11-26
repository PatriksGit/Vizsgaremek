/**
 * The staff dialog of one account (2026-11-26): its private details, the
 * e-mail change and switching 2FA off, each confirmed first, and the
 * account's last staff log entries.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'

import { PlayerDialog } from '@/features/management/PlayerDialog'
import type { ManagementPlayer } from '@/features/management/playersApi'
import { http } from '@/lib/api'
import { installFakeBackend, stubBrowserApis, type Handler } from '@/test/fakeBackend'

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', async (importOriginal) => ({ ...(await importOriginal<typeof import('sonner')>()), toast: toastMock }))

const originalAdapter = http.defaults.adapter
beforeAll(stubBrowserApis)
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  http.defaults.adapter = originalAdapter
})

const STEVE: ManagementPlayer = {
  name: 'Steve',
  uuid: '1a2b3c4d-0000-0000-0000-000000000000',
  email: 'steve@example.com',
  registered_at: '2026-10-11T08:00:00Z',
  registered_ip: '1.2.3.4',
  last_login_at: '2026-11-25T18:30:00Z',
  last_ip: '5.6.7.8',
  two_factor_enabled: true,
  locked: false,
  lock: null,
  protected: false,
  recent_actions: [],
}

const BARE: ManagementPlayer = {
  ...STEVE,
  name: 'Fresh',
  email: null,
  registered_ip: null,
  last_login_at: null,
  last_ip: null,
  two_factor_enabled: false,
}

const ok = (player: ManagementPlayer) => ({ status: 200, data: { data: player } })

function renderDialog(player: ManagementPlayer, routes: Record<string, Handler> = {}) {
  const calls = installFakeBackend({ [`GET /management/players/${player.name}`]: () => ok(player), ...routes })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  render(
    <QueryClientProvider client={client}>
      <PlayerDialog name={player.name} open onClose={() => {}} onClosed={() => {}} />
    </QueryClientProvider>,
  )
  return { calls, invalidate }
}

/** The title comes before the data: wait for the details themselves. */
async function details(name: string) {
  await screen.findByRole('heading', { name })
  await screen.findByText('UUID', { selector: 'dt' })
}

const row = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling?.textContent ?? ''

it('shows the private details', async () => {
  renderDialog(STEVE)

  await details('Steve')
  expect(row('UUID')).toBe(STEVE.uuid)
  expect(row('Regisztrált')).toContain('1.2.3.4')
  expect(row('Utolsó belépés')).toContain('5.6.7.8')
  expect(row('2FA')).toContain('Bekapcsolva')
  expect(row('Zárolás')).toContain('Nincs')
  expect(screen.getByText('Még nincs bejegyzés.')).toBeTruthy()
})

it('missing fields show a dash', async () => {
  renderDialog(BARE)

  await details('Fresh')
  expect(row('E-mail')).toContain('—')
  expect(row('Regisztrált')).toContain('—')
  expect(row('Utolsó belépés')).toContain('—')
})

it('email change confirms then saves', async () => {
  let body: unknown
  const { invalidate } = renderDialog(STEVE, {
    'PUT /management/players/Steve/email': (config) => {
      body = JSON.parse(config.data as string)
      return ok({ ...STEVE, email: 'new@example.com' })
    },
  })

  fireEvent.change(await screen.findByRole('textbox', { name: 'Új e-mail cím' }), { target: { value: 'new@example.com' } })
  fireEvent.click(screen.getByRole('button', { name: 'Mentés' }))

  const confirm = await screen.findByRole('alertdialog')
  expect(within(confirm).getByText('Biztosan átírod az e-mail címet?')).toBeTruthy()
  expect(confirm.textContent).toContain('steve@example.com → new@example.com')
  fireEvent.click(within(confirm).getByRole('button', { name: 'Átírás' }))

  await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('E-mail cím átírva.'))
  expect(body).toEqual({ email: 'new@example.com' })
  await waitFor(() => expect(row('E-mail')).toBe('new@example.com'))
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['management', 'actions'] })
})

it('422 shows under the field', async () => {
  renderDialog(STEVE, {
    'PUT /management/players/Steve/email': () => ({
      status: 422,
      data: { message: 'Ez az e-mail cím már foglalt.', code: 'validation_failed', errors: { email: ['Ez az e-mail cím már foglalt.'] } },
    }),
  })

  fireEvent.change(await screen.findByRole('textbox', { name: 'Új e-mail cím' }), { target: { value: 'alex@example.com' } })
  fireEvent.click(screen.getByRole('button', { name: 'Mentés' }))
  fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Átírás' }))

  expect(await screen.findByText('Ez az e-mail cím már foglalt.')).toBeTruthy()
  expect(toastMock.success).not.toHaveBeenCalled()
})

it('2FA button only when on', async () => {
  renderDialog(BARE)

  await details('Fresh')
  expect(screen.queryByRole('button', { name: '2FA kikapcsolása' })).toBeNull()
})

it('switching 2FA off confirms then saves', async () => {
  const { calls } = renderDialog(STEVE, {
    'DELETE /management/players/Steve/two-factor': () => ok({ ...STEVE, two_factor_enabled: false }),
  })

  fireEvent.click(await screen.findByRole('button', { name: '2FA kikapcsolása' }))
  const confirm = await screen.findByRole('alertdialog')
  expect(within(confirm).getByText('Biztosan kikapcsolod Steve 2FA-ját?')).toBeTruthy()
  fireEvent.click(within(confirm).getByRole('button', { name: 'Kikapcsolás' }))

  await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith('2FA kikapcsolva.'))
  expect(calls).toContain('DELETE /management/players/Steve/two-factor')
  await waitFor(() => expect(row('2FA')).toContain('Kikapcsolva'))
})

it('protected account disables both actions', async () => {
  renderDialog({ ...STEVE, protected: true })

  await details('Steve')
  expect(screen.getByText('Ez egy manager fiókja, itt nem módosítható.')).toBeTruthy()
  expect((screen.getByRole('textbox', { name: 'Új e-mail cím' }) as HTMLInputElement).disabled).toBe(true)
  expect((screen.getByRole('button', { name: 'Mentés' }) as HTMLButtonElement).disabled).toBe(true)
  expect((screen.getByRole('button', { name: '2FA kikapcsolása' }) as HTMLButtonElement).disabled).toBe(true)
})

it('confirm button is disabled while saving', async () => {
  const { calls } = renderDialog(STEVE, { 'PUT /management/players/Steve/email': () => new Promise(() => {}) })

  fireEvent.change(await screen.findByRole('textbox', { name: 'Új e-mail cím' }), { target: { value: 'new@example.com' } })
  fireEvent.click(screen.getByRole('button', { name: 'Mentés' }))
  const confirm = await screen.findByRole('alertdialog')
  fireEvent.click(within(confirm).getByRole('button', { name: 'Átírás' }))
  fireEvent.click(within(confirm).getByRole('button', { name: /Átírás/ }))

  await waitFor(() => expect((within(confirm).getByRole('button', { name: /Átírás/ }) as HTMLButtonElement).disabled).toBe(true))
  expect(calls.filter((call) => call === 'PUT /management/players/Steve/email')).toHaveLength(1)
})

it('the recent actions read as sentences', async () => {
  renderDialog({
    ...STEVE,
    recent_actions: [
      {
        id: 2,
        action: 'two_factor_disabled',
        manager: { name: 'Boss', email: 'boss@example.com' },
        target: { name: 'Steve' },
        old_value: null,
        new_value: null,
        created_at: '2026-11-26T09:00:00Z',
      },
      {
        id: 1,
        action: 'email_changed',
        manager: { name: 'Boss', email: 'boss@example.com' },
        target: { name: 'Steve' },
        old_value: null,
        new_value: 'steve@example.com',
        created_at: '2026-11-25T09:00:00Z',
      },
    ],
  })

  const list = await screen.findByRole('list', { name: 'Előzmények' })
  const items = within(list).getAllByRole('listitem')
  expect(items[0].textContent).toContain('Boss kikapcsolta Steve 2FA-ját')
  expect(items[1].textContent).toContain('Boss átírta Steve e-mail címét: nincs → steve@example.com')
})
