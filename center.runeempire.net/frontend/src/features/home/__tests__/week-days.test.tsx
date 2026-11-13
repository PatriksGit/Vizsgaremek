/**
 * Frontend review 2026-11-13, T1: the overview's week (streak boxes, "Ma", the playtime total)
 * is laid out in the browser's time zone, while GET /api/me/stats builds the
 * week in RuneActivity's zone (Europe/Budapest, FindPlayerActivity.php:34-36).
 *
 * Happens when: a player whose browser is in another zone opens the overview in
 * the hour(s) where their date differs from Budapest's.
 *
 * Harness only (jsdom has no matchMedia, ResizeObserver or WebGL): stubs for
 * matchMedia and ResizeObserver, and the 3D skin viewer mocked to nothing.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { HomePage } from '@/features/home/HomePage'
import { stubBrowserApis } from '@/test/fakeBackend'

const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api')>()
  return { ...original, http: { get: getMock } }
})
vi.mock('@/features/home/SkinViewer3D', () => ({ default: () => null }))

const account = {
  uuid: '00000000-0000-0000-0000-000000000001',
  username: 'reprouser',
  display_name: 'ReproUser',
  registered_at: '2026-01-01T10:00:00Z',
}

/** What FindPlayerActivity answers for the instant, in Europe/Budapest days. */
function respond(stats: unknown) {
  getMock.mockImplementation(async (url: string) => {
    if (url === '/auth/me') return { data: { data: account } }
    if (url === '/me/stats') return { data: { data: stats } }
    if (url === '/me/friends') return { data: { data: [] } }
    throw new Error(`unexpected GET ${url}`)
  })
}

function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <HomePage />
    </QueryClientProvider>,
  )
}

/** What the player reads: the week's total and the box under "Ma". */
async function readWeek() {
  const playtime = await screen.findByRole('region', { name: 'Játékidő ezen a héten' })
  const total = await waitFor(() => within(playtime).getByText(/^Összesen:/))
  const streak = screen.getByRole('list', { name: 'Napi sorozat ezen a héten' })
  await waitFor(() => expect(streak.getAttribute('aria-busy')).toBe('false'))
  const today = within(streak).getByText('Ma').closest('li')
  return { total: total.textContent, today: today?.querySelector('.sr-only')?.textContent }
}

beforeEach(() => {
  stubBrowserApis()
  vi.useFakeTimers({ toFake: ['Date'] })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.stubEnv('TZ', 'Europe/Budapest')
})

describe('the overview week follows Budapest days', () => {
  it('browser one hour ahead (Europe/Bucharest), Sunday 23:30 in Budapest', async () => {
    vi.stubEnv('TZ', 'Europe/Bucharest')
    // Sunday 2026-11-15 23:30 in Budapest; Monday 00:30 in Bucharest.
    vi.setSystemTime(new Date('2026-11-15T22:30:00Z'))
    respond({
      runes: 0,
      // Week of Monday 2026-11-09: 60 + 30 + 120 minutes.
      playtime: { total_seconds: 36000, week: [3600, 0, 1800, 0, 0, 7200, 0] },
      streak: { current: 1, best: 3, week: ['done', 'missed', 'done', 'missed', 'missed', 'done', 'pending'] },
      rank: { group: 'default', name: 'Játékos', expires_at: null },
      punishment: null,
      unavailable: [],
    })

    renderHome()

    expect(await readWeek()).toEqual({
      total: 'Összesen: 3 ó 30 p',
      today: 'Vasárnap (11.15): még nem léptél be',
    })
  })

  it('browser behind (America/New_York), Monday 00:30 in Budapest', async () => {
    vi.stubEnv('TZ', 'America/New_York')
    // Monday 2026-11-16 00:30 in Budapest; Sunday 18:30 in New York.
    vi.setSystemTime(new Date('2026-11-15T23:30:00Z'))
    respond({
      runes: 0,
      // The new week of Monday 2026-11-16: nothing yet.
      playtime: { total_seconds: 36000, week: [0, 0, 0, 0, 0, 0, 0] },
      streak: { current: 1, best: 3, week: ['pending', 'future', 'future', 'future', 'future', 'future', 'future'] },
      rank: { group: 'default', name: 'Játékos', expires_at: null },
      punishment: null,
      unavailable: [],
    })

    renderHome()

    expect((await readWeek()).today).toBe('Hétfő (11.16): még nem léptél be')
  })

  it('browser behind (America/New_York), midweek: Thursday 00:30 in Budapest', async () => {
    vi.stubEnv('TZ', 'America/New_York')
    // Thursday 2026-11-12 00:30 in Budapest; Wednesday 18:30 in New York.
    vi.setSystemTime(new Date('2026-11-11T23:30:00Z'))
    respond({
      runes: 0,
      // Week of Monday 2026-11-09: 60 + 30 + 10 (today) minutes.
      playtime: { total_seconds: 36000, week: [3600, 0, 1800, 600, 0, 0, 0] },
      streak: { current: 2, best: 3, week: ['done', 'missed', 'done', 'done', 'future', 'future', 'future'] },
      rank: { group: 'default', name: 'Játékos', expires_at: null },
      punishment: null,
      unavailable: [],
    })

    renderHome()

    expect(await readWeek()).toEqual({
      total: 'Összesen: 1 ó 40 p',
      today: 'Csütörtök (11.12): beléptél',
    })
  })
})
