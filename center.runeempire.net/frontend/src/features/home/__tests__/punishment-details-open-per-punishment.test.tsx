/**
 * Review 2026-11-24 HO-2: PunishmentCard kept its controlled `detailsOpen` while the punishment leaves the card. A player who
 * tapped the details open saw a NEW punishment's details open by themselves when a later refresh brings one (a new
 * mute after the old one ran out and the card said "Nincsen" in between).
 * Entry: the overview (HomePage) with the API faked; the 60 s refreshes are run with refetchQueries.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { HomePage } from '@/features/home/HomePage'
import { stubBrowserApis } from '@/test/fakeBackend'

const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api')>()
  return { ...original, http: { get: getMock } }
})
vi.mock('@/features/home/SkinViewer3D', () => ({ default: () => null }))

const account = { uuid: '00000000-0000-0000-0000-0000000000a2', username: 'muted', display_name: 'Muted', registered_at: '2026-01-01T10:00:00Z' }

const mute = { kind: 'mute', until: '2026-11-25T10:00:00Z', issued_at: '2026-11-20T10:00:00Z', issued_by: 'Mod', reason: 'Első némítás' }
const secondMute = { kind: 'mute', until: '2026-12-05T10:00:00Z', issued_at: '2026-11-24T10:00:00Z', issued_by: 'Mod', reason: 'Második némítás' }

let punishment: typeof mute | null = mute

beforeEach(() => {
  stubBrowserApis()
  punishment = mute
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
            punishment,
            unavailable: [],
          },
        },
      }
    }
    throw new Error(`unexpected GET ${url}`)
  })
})

afterEach(cleanup)

function tap(button: HTMLElement) {
  fireEvent(button, Object.assign(new Event('pointerdown', { bubbles: true }), { pointerType: 'touch' }))
  fireEvent.click(button)
}

/** Loads the overview, optionally taps and closes nothing, then lets two refreshes run: no punishment, then a new one. */
async function afterRefreshes(tapFirst: boolean) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <HomePage />
    </QueryClientProvider>,
  )
  const button = await screen.findByRole('button', { name: /Némítva eddig/ })
  if (tapFirst) {
    tap(button)
    expect(await screen.findByText('Első némítás')).toBeTruthy()
  }

  // The mute ran out: the next refresh has none.
  punishment = null
  await act(() => client.refetchQueries({ queryKey: ['stats'] }))
  expect(await screen.findByText('Nincsen')).toBeTruthy()

  // Later a new mute arrives; the player has not touched the card since.
  punishment = secondMute
  await act(() => client.refetchQueries({ queryKey: ['stats'] }))
  await screen.findByRole('button', { name: /Némítva eddig/ })
  await new Promise((resolve) => setTimeout(resolve, 300))
  return screen.queryByText('Második némítás') !== null
}

it('a new punishment brought by a refresh stays closed after an earlier tap', async () => {
  expect(await afterRefreshes(true)).toBe(false)
}, 15_000)

it('control: without the earlier tap the new punishment stays closed', async () => {
  expect(await afterRefreshes(false)).toBe(false)
}, 15_000)
