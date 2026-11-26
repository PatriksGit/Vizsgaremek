/**
 * The Management area's Játékosok tab (2026-11-26): one search box with a
 * Név / IP-cím / E-mail switch; each card shows the name and the field that
 * matters in that mode.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeAll, expect, it } from 'vitest'

import type { Account } from '@/features/auth/api'
import { ManagementPlayersPage } from '@/features/management/ManagementPlayersPage'
import { http } from '@/lib/api'
import { installFakeBackend, stubBrowserApis, type Handler } from '@/test/fakeBackend'

const ACCOUNT: Account = {
  uuid: 'u-1',
  username: 'boss',
  display_name: 'Boss',
  email: 'boss@example.com',
  two_factor_enabled: false,
  can_manage: true,
  registered_at: '2026-01-01T00:00:00Z',
}

const SIGNED_IN = { status: 200, data: { data: { signed_in: true, email: 'boss@example.com', expires_at: '2026-11-26T12:30:00Z' } } }

const originalAdapter = http.defaults.adapter
beforeAll(stubBrowserApis)
afterEach(() => {
  cleanup()
  http.defaults.adapter = originalAdapter
})

const searches: { by: string; q: string }[] = []

function renderPage(
  search: Handler,
  actions: Handler = () => ({ status: 200, data: { data: [], meta: { next_cursor: null } } }),
  path = '/management/jatekosok',
) {
  searches.length = 0
  installFakeBackend({
    'GET /management/me': () => SIGNED_IN,
    'GET /management/players': (config) => {
      searches.push(config.params)
      return search(config)
    },
    'GET /management/actions': actions,
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['account'], ACCOUNT)
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <ManagementPlayersPage />
        <AddressProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** What the address holds, for the tests of the search kept in it. */
function AddressProbe() {
  return <output data-testid="address">{useLocation().search}</output>
}

const STEVE = { name: 'Steve', email: 'steve@example.com', last_ip: '85.66.1.2' }
const FRESH = { name: 'Fresh', email: null, last_ip: null }
const found = (players: unknown[]) => () => ({ status: 200, data: { data: players, meta: { more: 0 } } })

it('typing in name mode asks with by=name and lists name + e-mail', async () => {
  renderPage(found([STEVE, FRESH]))

  fireEvent.change(await screen.findByRole('searchbox', { name: 'Játékosnév' }), { target: { value: 'ste' } })

  const list = await screen.findByRole('list', { name: 'Találatok' })
  expect(searches.at(-1)).toEqual({ by: 'name', q: 'ste' })
  expect(within(list).getByRole('button', { name: /Steve/ }).textContent).toContain('steve@example.com')
  // A field the account does not have is a dash, never an empty line.
  expect(within(list).getByRole('button', { name: /Fresh/ }).textContent).toContain('—')
})

it('IP mode asks with by=ip and shows the last IP on the cards', async () => {
  renderPage(found([STEVE]))

  fireEvent.click(await screen.findByRole('radio', { name: 'IP-cím' }))
  fireEvent.change(screen.getByRole('searchbox', { name: 'IP-cím' }), { target: { value: '85.66.' } })

  const card = await screen.findByRole('button', { name: /Steve/ })
  expect(searches.at(-1)).toEqual({ by: 'ip', q: '85.66.' })
  expect(card.textContent).toContain('85.66.1.2')
  expect(card.textContent).not.toContain('steve@example.com')
})

it('e-mail mode sends the address start trimmed and lowercased', async () => {
  renderPage(found([STEVE]))

  fireEvent.click(await screen.findByRole('radio', { name: 'E-mail' }))
  fireEvent.change(screen.getByRole('searchbox', { name: 'E-mail cím' }), { target: { value: ' Steve@Ex ' } })

  await screen.findByRole('button', { name: /Steve/ })
  expect(searches.at(-1)).toEqual({ by: 'email', q: 'steve@ex' })
})

it('a card opens the player dialog', async () => {
  renderPage(found([STEVE]))
  installFakeBackend({
    'GET /management/me': () => SIGNED_IN,
    'GET /management/players': found([STEVE]),
    'GET /management/players/Steve': () => ({
      status: 200,
      data: {
        data: {
          ...STEVE,
          uuid: 'u-steve',
          registered_at: null,
          registered_ip: null,
          last_login_at: null,
          two_factor_enabled: false,
          locked: false,
          lock: null,
          protected: false,
          recent_actions: [],
        },
      },
    }),
  })

  fireEvent.change(await screen.findByRole('searchbox', { name: 'Játékosnév' }), { target: { value: 'ste' } })
  fireEvent.click(await screen.findByRole('button', { name: /Steve/ }))

  const dialog = await screen.findByRole('dialog')
  expect(await within(dialog).findByText('u-steve')).toBeTruthy()
})

it('changing only the case of the query keeps the answer (no stuck skeleton)', async () => {
  renderPage(found([]))
  const box = await screen.findByRole('searchbox', { name: 'Játékosnév' })

  fireEvent.change(box, { target: { value: 'Zz' } })
  expect(await screen.findByText('Nincs találat')).toBeTruthy()
  fireEvent.change(box, { target: { value: 'zz' } })

  await new Promise((resolve) => setTimeout(resolve, 400))
  expect(screen.queryByText('Nincs találat')).toBeTruthy()
  expect(screen.queryByText('Keresés…')).toBeNull()
})

it('an answer to an unrelated earlier query is not shown while the new one loads', async () => {
  const PATRIK = { name: 'PatrikT', email: 'p@example.com', last_ip: null }
  renderPage((config) => (config.params.q === 'pa' ? found([PATRIK])() : new Promise(() => {})))
  const box = await screen.findByRole('searchbox', { name: 'Játékosnév' })

  fireEvent.change(box, { target: { value: 'pa' } })
  await screen.findByRole('button', { name: /PatrikT/ })
  fireEvent.change(box, { target: { value: 'be' } })

  await waitFor(() => expect(searches.at(-1)).toEqual({ by: 'name', q: 'be' }))
  expect(screen.queryByRole('button', { name: /PatrikT/ })).toBeNull()
})

it('the search lives in the address', async () => {
  renderPage(found([STEVE]))

  fireEvent.click(await screen.findByRole('radio', { name: 'IP-cím' }))
  fireEvent.change(screen.getByRole('searchbox', { name: 'IP-cím' }), { target: { value: '85.66.' } })

  await waitFor(() => expect(screen.getByTestId('address').textContent).toBe('?by=ip&q=85.66.'))
})

it('coming back to an address with a search restores the mode and the text', async () => {
  renderPage(found([STEVE]), undefined, '/management/jatekosok?by=ip&q=85.66.')

  expect(((await screen.findByRole('radio', { name: 'IP-cím' })) as HTMLInputElement).checked).toBe(true)
  expect((screen.getByRole('searchbox', { name: 'IP-cím' }) as HTMLInputElement).value).toBe('85.66.')
  await screen.findByRole('button', { name: /Steve/ })
  expect(searches[0]).toEqual({ by: 'ip', q: '85.66.' })
})

it('an unknown by in the address falls back to name', async () => {
  renderPage(found([]), undefined, '/management/jatekosok?by=uuid&q=ste')

  expect(((await screen.findByRole('radio', { name: 'Név' })) as HTMLInputElement).checked).toBe(true)
  expect((screen.getByRole('searchbox', { name: 'Játékosnév' }) as HTMLInputElement).value).toBe('ste')
})

it('no hit says so', async () => {
  renderPage(found([]))

  fireEvent.change(await screen.findByRole('searchbox', { name: 'Játékosnév' }), { target: { value: 'zz' } })

  expect(await screen.findByText('Nincs találat')).toBeTruthy()
})

