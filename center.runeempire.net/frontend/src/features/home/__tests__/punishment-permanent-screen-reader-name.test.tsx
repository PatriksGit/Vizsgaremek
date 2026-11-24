/**
 * Review 2026-11-24 HO-1: a permanent ban's value is "Végleges", but its screen-reader suffix was the timed ban's "(Kitiltva
 * eddig)", so a screen reader heard "Végleges (Kitiltva eddig)" -- "permanent (banned until)": an end that does not
 * exist. Entry: the overview (HomePage) with the API faked.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { HomePage } from '@/features/home/HomePage'
import { stubBrowserApis } from '@/test/fakeBackend'

const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api')>()
  return { ...original, http: { get: getMock } }
})
vi.mock('@/features/home/SkinViewer3D', () => ({ default: () => null }))

const account = { uuid: '00000000-0000-0000-0000-0000000000a1', username: 'banned', display_name: 'Banned', registered_at: '2026-01-01T10:00:00Z' }

let until: string | null = null

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
            // LiteBans until <= 0 (a permanent ban): FindActivePunishment sends null.
            punishment: { kind: 'ban', until, issued_at: '2026-11-14T03:30:00Z', issued_by: 'Admin', reason: 'teszt' },
            unavailable: [],
          },
        },
      }
    }
    throw new Error(`unexpected GET ${url}`)
  })
})

afterEach(cleanup)

async function punishmentName() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <HomePage />
    </QueryClientProvider>,
  )
  const card = (await screen.findByText('Büntetéseid')).closest('li')!
  const button = await vi.waitFor(() => {
    const found = card.querySelector('button')
    if (!found) throw new Error('no value yet')
    return found
  })
  return button.textContent
}

it('a permanent ban is read with its kind ("Végleges (Kitiltás)"), not as "banned until"', async () => {
  until = null
  const name = await punishmentName()
  expect(name).toMatch(/Végleges/)
  expect(name).not.toMatch(/eddig/)
  expect(name).toBe('Végleges (Kitiltás)')
}, 15_000)

it('control: a timed ban reads its end day with "Kitiltva eddig"', async () => {
  until = '2026-12-01T12:00:00Z'
  expect(await punishmentName()).toBe('2026.12.01. (Kitiltva eddig)')
}, 15_000)
