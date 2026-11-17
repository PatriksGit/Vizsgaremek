/**
 * Regression test (review 2026-11-17, home H1). The bug it guards against: the overview writes the rank's "Lejár:" day, the punishment's end day
 * and "Csatlakozott" in the BROWSER's zone, while the streak, the week and the rank shop
 * (features/ranks/dates.ts budapestDay: "as the game and the overview count days") use
 * Budapest days. A player whose browser is in another zone reads another day.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { budapestDay } from '@/features/ranks/dates'
import { stubBrowserApis } from '@/test/fakeBackend'

const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api')>()
  return { ...original, http: { get: getMock } }
})
vi.mock('@/features/home/SkinViewer3D', () => ({ default: () => null }))

// 04:00 on 21 November in Budapest; 22:00 on 20 November in New York.
const ENDS = '2026-11-21T03:00:00Z'
// 00:30 on 17 November in Budapest; 18:30 on 16 November in New York.
const REGISTERED = '2026-11-16T23:30:00Z'

const account = { uuid: '00000000-0000-0000-0000-000000000077', username: 'zoneuser', display_name: 'ZoneUser', registered_at: REGISTERED }

beforeEach(() => {
  stubBrowserApis()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-17T12:00:00Z'))
  getMock.mockImplementation(async (url: string) => {
    if (url === '/auth/me') return { data: { data: account } }
    if (url === '/me/friends') return { data: { data: [] } }
    if (url === '/discord-widget') throw new Error('no discord in this test')
    if (url === '/me/stats') {
      return {
        data: {
          data: {
            runes: 0,
            playtime: { total_seconds: 0, week: [0, 0, 0, 0, 0, 0, 0] },
            streak: { current: 0, best: 0, week: ['before', 'pending', 'future', 'future', 'future', 'future', 'future'] },
            rank: { group: 'caster', name: 'Caster', expires_at: ENDS, color: null },
            punishment: { kind: 'ban', until: ENDS, issued_at: '2026-11-14T10:00:00Z', issued_by: 'Admin', reason: 'teszt' },
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
  vi.useRealTimers()
  vi.stubEnv('TZ', 'Europe/Budapest')
  vi.resetModules()
})

/** The three days as the overview writes them, rendered with the browser in `zone`. */
async function daysShown(zone: string) {
  vi.stubEnv('TZ', zone)
  vi.resetModules()
  const { HomePage } = await import('@/features/home/HomePage')
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <HomePage />
    </QueryClientProvider>,
  )
  const expiry = await screen.findByText(/^Lejár:/)
  const punishment = screen.getByText('Büntetéseid').closest('li') as HTMLElement
  const banEnd = await waitFor(() => within(punishment).getByText(/^\d{4}\.\d{2}\.\d{2}\.$/))
  const joined = screen.getAllByText(/Csatlakozott:/)[0].querySelector('strong')
  return { expiry: expiry.textContent, banEnd: banEnd.textContent, joined: joined?.textContent }
}

/** The Budapest days: what the rank shop shows for the same moments, and the streak's first day after 'before'. */
const BUDAPEST = { expiry: 'Lejár: 2026.11.21.', banEnd: '2026.11.21.', joined: '2026. november 17.' }

it('the days are Budapest days in another browser zone', async () => {
  // The rank shop's own function writes this day for the same expiry, in any browser zone.
  vi.stubEnv('TZ', 'America/New_York')
  expect(budapestDay(new Date(ENDS))).toBe('2026.11.21.')
  expect(await daysShown('America/New_York')).toEqual(BUDAPEST)
}, 15_000)

it('the days are Budapest days in Budapest', async () => {
  expect(await daysShown('Europe/Budapest')).toEqual(BUDAPEST)
}, 15_000)
