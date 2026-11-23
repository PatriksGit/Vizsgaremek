/**
 * Regression test (frontend review 2026-11-23, Phase 2 review carry-over): the asked-for page
 * travels in the router state, which is the browser's history entry. Only a string `from` is
 * passed on across the login card (fromState.ts useFromState) or followed after a login
 * (GuestOnly); anything else is dropped. Before, any `from` value was forwarded, and GuestOnly
 * called startsWith on it, so a number crashed the login page.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeAll, expect, it } from 'vitest'

import { GuestOnly } from '@/features/auth/guards'
import { useFromState } from '@/features/auth/fromState'
import { installFakeBackend, stubBrowserApis } from '@/test/fakeBackend'

const ACCOUNT = { uuid: 'u-1', username: 'steve_01', display_name: 'Steve_01', registered_at: '2026-01-01T00:00:00Z' }

beforeAll(stubBrowserApis)
afterEach(cleanup)

function ShowFrom() {
  return <p>FROM {JSON.stringify(useFromState())}</p>
}

function renderLogin(state: unknown, me: unknown) {
  installFakeBackend({ 'GET /auth/me': () => ({ status: 200, data: { data: me } }) })
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[{ pathname: '/login', state }]}>
        <Routes>
          <Route path="/" element={<p>FŐOLDAL</p>} />
          <Route path="/jatekosok" element={<p>JÁTÉKOSOK</p>} />
          <Route
            path="/login"
            element={
              <GuestOnly>
                <ShowFrom />
              </GuestOnly>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('a string from is passed on alone, without the rest of the state', async () => {
  renderLogin({ from: '/jatekosok', username: 'Steve_01' }, null)

  expect((await screen.findByText(/^FROM/)).textContent).toBe('FROM {"from":"/jatekosok"}')
})

it('a from that is not a string is not passed on', async () => {
  renderLogin({ from: 42 }, null)

  expect((await screen.findByText(/^FROM/)).textContent).toBe('FROM null')
})

it('a logged-in player with a from that is not a string goes home, the page does not crash', async () => {
  renderLogin({ from: 42 }, ACCOUNT)

  expect(await screen.findByText('FŐOLDAL')).toBeTruthy()
})

it('control: a logged-in player with a string from goes back to that page', async () => {
  renderLogin({ from: '/jatekosok' }, ACCOUNT)

  expect(await screen.findByText('JÁTÉKOSOK')).toBeTruthy()
})
