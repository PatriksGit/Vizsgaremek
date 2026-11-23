/**
 * Regression test (frontend review 2026-11-23, app-shell AS-N1): a page that arrived with router
 * state {quiet: true} (home after a refused management sign-in) lost data-quiet while it stayed on
 * screen when the player clicked the menu link of the same page (Főoldal on home, the logo, the
 * skip link's #tartalom): that entry has no state. The same .content-in element was then no longer
 * under [data-quiet], so in a browser its animation went from none to content-in and the page built
 * up again. AppLayout now decides the quiet once per page. jsdom runs no CSS animations: this pins
 * the mechanism (the element keeps its [data-quiet] ancestor).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { AppLayout } from '@/features/app/AppLayout'
import { stubBrowserApis } from '@/test/fakeBackend'

const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api')>()
  return { ...original, http: { get: getMock } }
})

beforeEach(() => {
  stubBrowserApis()
  getMock.mockImplementation(async (url: string) => {
    if (url === '/auth/me') {
      return { data: { data: { uuid: 'u', username: 'reprouser', display_name: 'ReproUser', registered_at: null } } }
    }
    throw new Error(`unexpected GET ${url}`)
  })
})

afterEach(cleanup)

function renderHome(state: unknown) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[{ pathname: '/', state }]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<h1 className="content-in">Főoldal tartalma</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** The sidebar's Főoldal row (the first link named Főoldal: the sidebar comes before the tab bar). */
const homeMenuLink = () => screen.getAllByRole('link', { name: /Főoldal/ })[0]

it('repro: home reached quietly stays quiet after the Főoldal menu link is clicked on it', () => {
  renderHome({ quiet: true })
  const heading = screen.getByRole('heading', { name: 'Főoldal tartalma' })
  expect(heading.closest('[data-quiet]')).not.toBeNull()

  fireEvent.click(homeMenuLink())

  // The same element is still on screen ...
  expect(screen.getByRole('heading', { name: 'Főoldal tartalma' })).toBe(heading)
  // ... and should keep its quiet, or its build-up plays now, on a page that is already shown.
  expect(heading.closest('[data-quiet]')).not.toBeNull()
})

it('control: home reached normally has no quiet before or after the click, and stays mounted', () => {
  renderHome(null)
  const heading = screen.getByRole('heading', { name: 'Főoldal tartalma' })
  expect(heading.closest('[data-quiet]')).toBeNull()

  fireEvent.click(homeMenuLink())

  expect(screen.getByRole('heading', { name: 'Főoldal tartalma' })).toBe(heading)
  expect(heading.closest('[data-quiet]')).toBeNull()
})
