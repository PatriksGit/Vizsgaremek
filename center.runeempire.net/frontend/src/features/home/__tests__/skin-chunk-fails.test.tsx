/**
 * Frontend review 2026-11-13d (app-B1): when the 3D skin viewer's own code chunk cannot be loaded
 * (a dropped request on a phone network, or a deploy that replaced the
 * hashed chunk while the tab was open), the whole overview turns into the
 * "Valami hiba történt" page instead of the hero falling back to the CSS
 * Steve. SkinFigure's onError only covers the viewer constructor and
 * loadSkin; the lazy import's rejection reaches the root errorElement.
 *
 * Kiváltó test: the SkinViewer3D module fails to load. Control test: it
 * loads (a component that draws nothing, as in rank-colours.test.tsx).
 *
 * Harness only: matchMedia and ResizeObserver stubs (jsdom has neither); the
 * root route's errorElement is App.tsx's (<ErrorPage />).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { ErrorPage } from '@/components/ErrorPage'

const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api')>()
  return { ...original, http: { get: getMock } }
})

const account = {
  uuid: '00000000-0000-0000-0000-0000000000b1',
  username: 'chunkuser',
  display_name: 'ChunkUser',
  registered_at: '2026-01-01T10:00:00Z',
}

beforeEach(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver

  getMock.mockImplementation(async (url: string) => {
    if (url === '/auth/me') return { data: { data: account } }
    if (url === '/me/friends') return { data: { data: [] } }
    if (url === '/discord-widget') return { data: { data: { presence_count: 0, instant_invite: null, channels: [], members: [] } } }
    if (url === '/me/stats') {
      return {
        data: {
          data: {
            runes: 1234,
            playtime: { total_seconds: 0, week: [0, 0, 0, 0, 0, 0, 0] },
            streak: { current: 0, best: 0, week: ['missed', 'missed', 'pending', 'future', 'future', 'future', 'future'] },
            rank: { group: 'default', name: 'Játékos', expires_at: null, color: null },
            punishment: null,
            unavailable: [],
          },
        },
      }
    }
    throw new Error(`unexpected GET ${url}`)
  })
})

afterEach(() => {
  cleanup()
  vi.doUnmock('@/features/home/SkinViewer3D')
  vi.resetModules()
})

/** The overview under a root route with App.tsx's errorElement, from fresh modules (lazy() caches per module instance). */
async function renderOverview() {
  const { HomePage } = await import('@/features/home/HomePage')
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter([{ errorElement: <ErrorPage />, children: [{ index: true, element: <HomePage /> }] }])
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  await waitFor(() => expect(getMock).toHaveBeenCalledWith('/me/stats'))
  // Let the lazy import settle and the stats arrive.
  await act(() => new Promise((resolve) => setTimeout(resolve, 300)))

  return {
    errorPage: screen.queryByText('Valami hiba történt') !== null,
    runes: screen.queryByText('Rúnáid') !== null,
  }
}

// Every case reloads the modules and renders the whole overview: under the full parallel suite that can pass 5 s.
const SLOW = 15_000

it('a 3D viewer chunk that fails to load leaves the overview standing', { timeout: SLOW }, async () => {
  vi.doMock('@/features/home/SkinViewer3D', () => {
    throw new TypeError('Failed to fetch dynamically imported module: /assets/SkinViewer3D-old.js')
  })

  expect(await renderOverview()).toEqual({ errorPage: false, runes: true })
})

it('control: with the chunk loaded the overview shows', { timeout: SLOW }, async () => {
  vi.doMock('@/features/home/SkinViewer3D', () => ({ default: () => null }))

  expect(await renderOverview()).toEqual({ errorPage: false, runes: true })
})
