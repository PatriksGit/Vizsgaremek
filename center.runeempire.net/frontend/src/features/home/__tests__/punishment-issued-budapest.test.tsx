/**
 * Regression test (review 2026-11-23, home H4): the punishment card writes its end day as a Budapest day
 * (shortDate), but the details' "Kapta" in the BROWSER's zone (PunishmentCard's dateTime has no
 * timeZone). A banned player whose browser is in New York reads that the ban was given the
 * day before the one the game, the staff and the card's own end date count in.
 *
 * Fakes only the edge: the API (vi.mock('@/lib/api')); the browser zone with vi.stubEnv('TZ').
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { stubBrowserApis } from '@/test/fakeBackend'

const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api')>()
  return { ...original, http: { get: getMock } }
})
vi.mock('@/features/home/SkinViewer3D', () => ({ default: () => null }))

// 04:30 on 14 November in Budapest; 22:30 on 13 November in New York.
const ISSUED = '2026-11-14T03:30:00Z'

const account = { uuid: '00000000-0000-0000-0000-000000000081', username: 'banned', display_name: 'Banned', registered_at: '2026-01-01T10:00:00Z' }

beforeEach(() => {
  stubBrowserApis()
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
            streak: { current: 0, best: 0, week: ['missed', 'missed', 'missed', 'missed', 'missed', 'missed', 'pending'] },
            rank: { group: 'default', name: 'Játékos', expires_at: null, color: null },
            punishment: { kind: 'ban', until: '2026-12-01T12:00:00Z', issued_at: ISSUED, issued_by: 'Admin', reason: 'teszt' },
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
  vi.stubEnv('TZ', 'Europe/Budapest')
  vi.resetModules()
})

/** The details' "Kapta" line, with the browser in `zone`. */
async function issuedShown(zone: string) {
  vi.stubEnv('TZ', zone)
  vi.resetModules()
  const { HomePage } = await import('@/features/home/HomePage')
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <HomePage />
    </QueryClientProvider>,
  )
  // Enter on the value opens the details (a click without a pointer).
  fireEvent.click(await screen.findByRole('button', { name: /Kitiltva eddig/ }))
  const label = await screen.findByText('Kapta')
  return label.nextElementSibling?.textContent
}

it('repro: "Kapta" is the Budapest day with the browser in New York', async () => {
  // The Budapest day of the issue, like the end date beside it.
  expect(await issuedShown('America/New_York')).toMatch(/^2026\. nov\. 14\./)
}, 15_000)

it('control: the browser in Budapest', async () => {
  expect(await issuedShown('Europe/Budapest')).toMatch(/^2026\. nov\. 14\./)
}, 15_000)
