/**
 * Regression test (review 2026-11-17, home H2). The bug it guards against: the overview lays the stats' week onto TODAY's dates at render time
 * (serverToday() / serverTodayIndex() read the clock on every render), not onto the day the
 * numbers are for. A failed 60 s refresh after a good load keeps the last numbers (the rule),
 * so across Budapest midnight last week's boxes and minutes appear under the new week's dates.
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

const account = { uuid: '00000000-0000-0000-0000-000000000078', username: 'weekuser', display_name: 'WeekUser', registered_at: '2026-01-01T10:00:00Z' }

/** The week of Monday 2026-11-09 as FindPlayerActivity answers on Sunday 15 November. */
const lastWeek = {
  runes: 0,
  // 60 + 30 + 120 + 10 minutes.
  playtime: { total_seconds: 36000, week: [3600, 0, 1800, 0, 0, 7200, 600] },
  streak: { current: 2, best: 3, week: ['done', 'missed', 'done', 'missed', 'missed', 'done', 'done'] },
  rank: { group: 'default', name: 'Játékos', expires_at: null, color: null },
  punishment: null,
  unavailable: [],
}

let backendUp = true

beforeEach(() => {
  stubBrowserApis()
  vi.stubEnv('TZ', 'Europe/Budapest')
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
  backendUp = true
  getMock.mockImplementation(async (url: string) => {
    if (url === '/auth/me') return { data: { data: account } }
    if (!backendUp) throw new Error('backend down')
    if (url === '/me/stats') return { data: { data: lastWeek } }
    if (url === '/me/friends') return { data: { data: [] } }
    throw new Error(`unexpected GET ${url}`)
  })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

/** What the player reads: the week's total and the box under "Ma". */
function readWeek() {
  const playtime = screen.getByRole('region', { name: 'Játékidő ezen a héten' })
  const total = within(playtime).getByText(/^Összesen:/).textContent
  const streak = screen.getByRole('list', { name: 'Napi sorozat ezen a héten' })
  const today = within(streak).getByText('Ma').closest('li')?.querySelector('.sr-only')?.textContent
  return { total, today }
}

/** Loads the overview at `loadAt`, then lets the backend fail and the 60 s refresh (with its one retry) run. */
async function weekAfterFailedRefresh(loadAt: string) {
  vi.setSystemTime(new Date(loadAt))
  const client = new QueryClient()
  render(
    <QueryClientProvider client={client}>
      <HomePage />
    </QueryClientProvider>,
  )
  await act(() => vi.advanceTimersByTimeAsync(100))
  const before = readWeek()
  backendUp = false
  await act(() => vi.advanceTimersByTimeAsync(65_000))
  return { before, after: readWeek() }
}

const SUNDAY = { total: 'Összesen: 3 ó 40 p', today: 'Vasárnap (11.15): beléptél' }

it('a refresh failing after midnight keeps last week\'s numbers on last week\'s dates', async () => {
  // Sunday 23:59:30 in Budapest; the refresh fails just after midnight.
  const { before, after } = await weekAfterFailedRefresh('2026-11-15T22:59:30Z')
  expect(before).toEqual(SUNDAY)
  expect(after).toEqual(SUNDAY)
}, 15_000)

it('a refresh failing before midnight keeps the week', async () => {
  // Sunday 23:57:00 in Budapest; the refresh fails before midnight.
  const { before, after } = await weekAfterFailedRefresh('2026-11-15T22:57:00Z')
  expect(before).toEqual(SUNDAY)
  expect(after).toEqual(SUNDAY)
}, 15_000)
