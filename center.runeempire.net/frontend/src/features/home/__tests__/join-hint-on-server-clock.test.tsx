/**
 * Regression test (review 2026-11-24, home HO-K1; advisor, 2026-11-24): the "new player" checks (the 7-day JoinCard and
 * the first-day greeting) counted the account's age on the VISITOR's clock (Date.now()), so a device clock days off
 * showed the join hint to an old player or hid it from a new one. They count against the server's moment, the stats'
 * Date header (answeredAt), like the week (review 2026-11-23 H2).
 *
 * Fakes only the edges: the API (vi.mock('@/lib/api'), answering with a Date header) and the clock.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { HomePage } from '@/features/home/HomePage'
import { stubBrowserApis } from '@/test/fakeBackend'

const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api')>()
  return { ...original, http: { get: getMock } }
})
vi.mock('@/features/home/SkinViewer3D', () => ({ default: () => null }))

/** Wednesday 18 November 2026, 12:00 in Budapest: the server's moment. */
const SERVER_NOW = new Date('2026-11-18T11:00:00Z')

const stats = {
  runes: 0,
  playtime: { total_seconds: 0, week: [0, 0, 0, 0, 0, 0, 0] },
  streak: { current: 0, best: 0, week: ['missed', 'missed', 'pending', 'future', 'future', 'future', 'future'] },
  rank: { group: 'default', name: 'Játékos', expires_at: null, color: null },
  punishment: null,
  unavailable: [],
}

let registeredAt = ''

beforeEach(() => {
  stubBrowserApis()
  vi.stubEnv('TZ', 'Europe/Budapest')
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
  const headers = { date: SERVER_NOW.toUTCString() }
  getMock.mockImplementation(async (url: string) => {
    const account = { uuid: '00000000-0000-0000-0000-000000000081', username: 'newbie', display_name: 'Newbie', registered_at: registeredAt }
    if (url === '/auth/me') return { data: { data: account }, headers }
    if (url === '/me/stats') return { data: { data: stats }, headers }
    if (url === '/me/friends') return { data: { data: [] }, headers }
    throw new Error(`unexpected GET ${url}`)
  })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

/** The overview of an account made at `registered`, with the browser's clock at `clock`: is the join hint there, and the greeting. */
async function overview(registered: string, clock: Date) {
  registeredAt = registered
  vi.setSystemTime(clock)
  render(
    <QueryClientProvider client={new QueryClient()}>
      <HomePage />
    </QueryClientProvider>,
  )
  await act(() => vi.advanceTimersByTimeAsync(100))
  return {
    // The JoinCard is the region labelled by its title, #join-title.
    joinHint: document.getElementById('join-title') !== null,
    greeting: screen.getByText(/^Üdv/).textContent,
  }
}

/** Three days before the server's moment: a new player. */
const THREE_DAYS_OLD = '2026-11-15T11:00:00Z'
/** Ten days before it: no longer new. */
const TEN_DAYS_OLD = '2026-11-08T11:00:00Z'
/** Two hours before it: the first day. */
const TWO_HOURS_OLD = '2026-11-18T09:00:00Z'

it('a new player sees the join hint even with a device clock a month ahead', async () => {
  expect(await overview(THREE_DAYS_OLD, new Date('2026-12-18T11:00:00Z'))).toEqual({ joinHint: true, greeting: 'Üdv újra a birodalomban,' })
}, 15_000)

it('an old player gets no join hint even with a device clock a week behind', async () => {
  expect(await overview(TEN_DAYS_OLD, new Date('2026-11-11T11:00:00Z'))).toEqual({ joinHint: false, greeting: 'Üdv újra a birodalomban,' })
}, 15_000)

it('a player on their first day is welcomed, not welcomed back, even with a device clock two days ahead', async () => {
  expect(await overview(TWO_HOURS_OLD, new Date('2026-11-20T11:00:00Z'))).toEqual({ joinHint: true, greeting: 'Üdv a birodalomban,' })
}, 15_000)

it('control: the device clock equals the server\'s', async () => {
  expect(await overview(THREE_DAYS_OLD, SERVER_NOW)).toEqual({ joinHint: true, greeting: 'Üdv újra a birodalomban,' })
  cleanup()
  expect(await overview(TEN_DAYS_OLD, SERVER_NOW)).toEqual({ joinHint: false, greeting: 'Üdv újra a birodalomban,' })
}, 15_000)
