/**
 * Frontend review 2026-11-13, T2: HomePage rounds each day's seconds to whole minutes
 * (HomePage.tsx:80, Math.round(seconds / 60)), so a week whose only play is
 * under half a minute adds up to 0 and the card says "Még nincs játékidőd
 * ezen a héten", while the streak beside it marks that day "beléptél".
 *
 * Happens when: the player was on the server for 20 seconds this week.
 *
 * Harness only: stubs for matchMedia and ResizeObserver (jsdom has neither),
 * the 3D skin viewer mocked to nothing (no WebGL).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { HomePage } from '@/features/home/HomePage'
import { stubBrowserApis } from '@/test/fakeBackend'

const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api')>()
  return { ...original, http: { get: getMock } }
})
vi.mock('@/features/home/SkinViewer3D', () => ({ default: () => null }))

const account = {
  uuid: '00000000-0000-0000-0000-000000000002',
  username: 'reprouser',
  display_name: 'ReproUser',
  registered_at: '2026-01-01T10:00:00Z',
}

beforeEach(() => {
  vi.stubEnv('TZ', 'Europe/Budapest')
  stubBrowserApis()
  vi.useFakeTimers({ toFake: ['Date'] })
  // Wednesday 2026-11-11 20:00 in Budapest.
  vi.setSystemTime(new Date('2026-11-11T19:00:00Z'))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

it('a week with a short session does not read as no playtime', async () => {
  const mondaySeconds = 20
  getMock.mockImplementation(async (url: string) => {
    if (url === '/auth/me') return { data: { data: account } }
    if (url === '/me/friends') return { data: { data: [] } }
    if (url === '/me/stats') {
      return {
        data: {
          data: {
            runes: 0,
            playtime: { total_seconds: mondaySeconds, week: [mondaySeconds, 0, 0, 0, 0, 0, 0] },
            streak: { current: 0, best: 1, week: ['done', 'missed', 'pending', 'future', 'future', 'future', 'future'] },
            rank: { group: 'default', name: 'Játékos', expires_at: null },
            punishment: null,
            unavailable: [],
          },
        },
      }
    }
    throw new Error(`unexpected GET ${url}`)
  })

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <HomePage />
    </QueryClientProvider>,
  )

  const playtime = await screen.findByRole('region', { name: 'Játékidő ezen a héten' })
  const total = await waitFor(() => within(playtime).getByText(/^Összesen:/))
  // The streak beside it says Monday was played.
  expect(screen.getByText('Hétfő (11.09): beléptél')).toBeTruthy()

  expect({
    total: total.textContent,
    emptyNotice: within(playtime).queryByText('Még nincs játékidőd ezen a héten') !== null,
  }).toEqual({ total: 'Összesen: 1 p', emptyNotice: false })
})
