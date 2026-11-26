/**
 * The Napló tab (2026-11-26): every staff action, newest first, 25 at a
 * time; "Több betöltése" asks for the next page by its cursor.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, expect, it } from 'vitest'

import { ManagementLog } from '@/features/management/ManagementLog'
import type { ManagementAction } from '@/features/management/playersApi'
import { http } from '@/lib/api'
import { installFakeBackend, stubBrowserApis, type Handler } from '@/test/fakeBackend'

const originalAdapter = http.defaults.adapter
beforeAll(stubBrowserApis)
afterEach(() => {
  cleanup()
  http.defaults.adapter = originalAdapter
})

const action = (id: number, overrides: Partial<ManagementAction> = {}): ManagementAction => ({
  id,
  action: 'email_changed',
  manager: { name: 'Boss', email: 'boss@example.com' },
  target: { name: `Player${id}` },
  old_value: 'old@example.com',
  new_value: 'new@example.com',
  created_at: '2026-11-26T09:00:00Z',
  ...overrides,
})

function renderLog(actions: Handler) {
  installFakeBackend({ 'GET /management/actions': actions })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ManagementLog />
    </QueryClientProvider>,
  )
}

it('renders both kinds of entries as sentences with the manager address', async () => {
  renderLog(() => ({
    status: 200,
    data: { data: [action(2, { action: 'two_factor_disabled', old_value: null, new_value: null }), action(1)], meta: { next_cursor: null } },
  }))

  const items = within(await screen.findByRole('list', { name: 'Napló' })).getAllByRole('listitem')
  expect(items[0].textContent).toContain('Boss kikapcsolta Player2 2FA-ját')
  expect(items[1].textContent).toContain('Boss átírta Player1 e-mail címét: old@example.com → new@example.com')
  expect(items[1].textContent).toContain('boss@example.com')
})

it('Több betöltése asks with the cursor and appends, and is gone on the last page', async () => {
  const cursors: unknown[] = []
  renderLog((config) => {
    cursors.push(config.params?.cursor)
    return config.params?.cursor === 'next-1'
      ? { status: 200, data: { data: [action(1)], meta: { next_cursor: null } } }
      : { status: 200, data: { data: [action(3), action(2)], meta: { next_cursor: 'next-1' } } }
  })

  fireEvent.click(await screen.findByRole('button', { name: 'Több betöltése' }))

  await waitFor(() => expect(within(screen.getByRole('list', { name: 'Napló' })).getAllByRole('listitem')).toHaveLength(3))
  expect(cursors).toEqual([undefined, 'next-1'])
  expect(screen.queryByRole('button', { name: 'Több betöltése' })).toBeNull()
})

it('an empty log says so', async () => {
  renderLog(() => ({ status: 200, data: { data: [], meta: { next_cursor: null } } }))

  expect(await screen.findByText('Még nincs bejegyzés.')).toBeTruthy()
})
