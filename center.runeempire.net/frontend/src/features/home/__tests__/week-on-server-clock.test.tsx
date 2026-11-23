/**
 * Regression test (review 2026-11-23, home H2): the overview lays the server's week out on the VISITOR's clock.
 * asOf is the query's dataUpdatedAt, the browser's Date.now() when the answer arrived, so a
 * device clock a day behind puts "Ma" on yesterday and cuts today's minutes out of "Összesen".
 * The auth code already counts against the response's Date header for this reason
 * (features/auth/api.ts localTime: "the visitor's clock can be hours off").
 *
 * Fakes only the edges: the API (vi.mock('@/lib/api'), answering with a Date header) and the clock.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { HomePage } from '@/features/home/HomePage'
import { stubBrowserApis } from '@/test/fakeBackend'

const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api')>()
  return { ...original, http: { get: getMock } }
})
vi.mock('@/features/home/SkinViewer3D', () => ({ default: () => null }))

const account = { uuid: '00000000-0000-0000-0000-000000000079', username: 'clockuser', display_name: 'ClockUser', registered_at: '2026-01-01T10:00:00Z' }

/** Wednesday 18 November 2026, 12:00 in Budapest: the server's moment. */
const SERVER_NOW = new Date('2026-11-18T11:00:00Z')

/** The week as the backend answers on that Wednesday: an hour played today, not logged in yet today. */
const wednesday = {
  runes: 0,
  playtime: { total_seconds: 3600, week: [0, 0, 3600, 0, 0, 0, 0] },
  streak: { current: 0, best: 1, week: ['missed', 'missed', 'pending', 'future', 'future', 'future', 'future'] },
  rank: { group: 'default', name: 'Játékos', expires_at: null, color: null },
  punishment: null,
  unavailable: [],
}

beforeEach(() => {
  stubBrowserApis()
  vi.stubEnv('TZ', 'Europe/Budapest')
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
  const headers = { date: SERVER_NOW.toUTCString() }
  getMock.mockImplementation(async (url: string) => {
    if (url === '/auth/me') return { data: { data: account }, headers }
    if (url === '/me/stats') return { data: { data: wednesday }, headers }
    if (url === '/me/friends') return { data: { data: [] }, headers }
    throw new Error(`unexpected GET ${url}`)
  })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

/** The overview with the browser's clock at `clock`; what the player reads: the week's total and the box under "Ma". */
async function weekShown(clock: Date) {
  vi.setSystemTime(clock)
  render(
    <QueryClientProvider client={new QueryClient()}>
      <HomePage />
    </QueryClientProvider>,
  )
  await act(() => vi.advanceTimersByTimeAsync(100))
  const playtime = screen.getByRole('region', { name: 'Játékidő ezen a héten' })
  const streak = screen.getByRole('list', { name: 'Napi sorozat ezen a héten' })
  return {
    total: within(playtime).getByText(/^Összesen:/).textContent,
    today: within(streak).getByText('Ma').closest('li')?.querySelector('.sr-only')?.textContent,
  }
}

const WEDNESDAY = { total: 'Összesen: 1 ó', today: 'Szerda (11.18): még nem léptél be' }

it('repro: a device clock a day behind still lays out the server\'s Wednesday', async () => {
  // The device clock is a day behind: Tuesday 12:00 in Budapest.
  expect(await weekShown(new Date('2026-11-17T11:00:00Z'))).toEqual(WEDNESDAY)
}, 15_000)

it('control: the device clock equals the server\'s', async () => {
  expect(await weekShown(SERVER_NOW)).toEqual(WEDNESDAY)
}, 15_000)
