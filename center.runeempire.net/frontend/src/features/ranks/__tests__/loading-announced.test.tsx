/**
 * Regression test (review 2026-11-17, UI-3). The bug it guards against: components/ui/skeleton.tsx is aria-hidden (a project
 * customisation) on the promise that "the card says 'betöltés…' once"
 * (frontend CLAUDE.md, Loading and missing data). Two places that show
 * skeletons do not: the rank shop's BalanceBar ("Egyenleged" + a hidden
 * skeleton) and the overview's StreakPanel (its count and day boxes). While
 * the stats load, a screen reader hears the label and then nothing.
 *
 * Happens when: a screen-reader user opens /rangok or / while GET /api/me/stats is still loading.
 *
 * The shop half enters at RanksPage with GET /api/me/stats held pending; the
 * streak half renders StreakPanel as HomePage.tsx:51 -> HeroCard.tsx:62 pass
 * it while the stats load (streak undefined).
 */
import { faCoins } from '@fortawesome/free-solid-svg-icons'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { StatCard } from '@/features/home/StatCard'
import { StreakPanel } from '@/features/home/StreakPanel'
import { OWN_WORDING } from '@/features/home/wording'
import { RanksPage } from '@/features/ranks/RanksPage'
import { stubBrowserApis } from '@/test/fakeBackend'

const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api')>()
  return { ...original, http: { get: getMock } }
})

const account = { uuid: '00000000-0000-0000-0000-000000000009', username: 'shopper', display_name: 'Shopper', registered_at: '2026-01-01T10:00:00Z' }
const RANKS = [
  { group: 'mage', name: 'Mage', details: 'Egy rang.', gif_url: null, prefix_url: null, prices: [{ days: 30, runes: 1000 }], season_ends_at: null, color: null },
]

beforeEach(() => {
  stubBrowserApis()
  getMock.mockImplementation((url: string) => {
    if (url === '/auth/me') return Promise.resolve({ data: { data: account } })
    if (url === '/ranks') return Promise.resolve({ data: { data: RANKS } })
    // The stats are still on their way.
    if (url === '/me/stats') return new Promise(() => {})
    return Promise.reject(new Error(`unexpected GET ${url}`))
  })
})

afterEach(cleanup)

it('the balance and the streak say "betöltés…" while the stats load', async () => {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/rangok']}>
        <RanksPage />
        <div data-testid="streak">
          <StreakPanel streak={undefined} text={OWN_WORDING.streak} asOf={new Date()} />
        </div>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  // The ranks are in; only the stats (the balance) are loading.
  await screen.findByRole('heading', { name: 'Mage' })

  const balance = screen.getByRole('region', { name: 'Egyenleged' })
  const streak = screen.getByTestId('streak')
  expect({ balance: balance.textContent?.includes('betöltés'), streak: streak.textContent?.includes('betöltés') }).toEqual({
    balance: true,
    streak: true,
  })
})

it('a stat card says "betöltés…" while it loads', () => {
  render(
    <ul>
      <StatCard label="Rúnáid" icon={faCoins} value={undefined} />
    </ul>,
  )

  expect(screen.getByRole('listitem').textContent).toContain('betöltés')
})
