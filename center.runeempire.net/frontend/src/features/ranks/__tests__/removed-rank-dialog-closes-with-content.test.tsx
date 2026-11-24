/**
 * Regression test (review 2026-11-23, visual V3 = ranks-players NB1). A refetch that takes the rank of an open dialog
 * off sale (or, after RP1, the purchase's duration) closes the dialog, but the rank went at once: during the ~170 ms exit
 * animation a 640x2 px frame with only the corner X faded out (measured in a real browser). The dialogs now keep the last
 * rank they showed until their exit animation ends, like a plain close (UI-N2).
 *
 * Fakes only the edges: the API (vi.mock('@/lib/api')) and the exit animation (jsdom runs none, so Base UI would unmount
 * at once): Element.getAnimations returns one unfinished animation while the dialog closes.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { MyStats } from '@/features/home/api'
import { RanksPage } from '@/features/ranks/RanksPage'
import { stubBrowserApis } from '@/test/fakeBackend'

const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api')>()
  return { ...original, http: { get: getMock } }
})

const account = { uuid: '00000000-0000-0000-0000-000000000011', username: 'shopper', display_name: 'Shopper', registered_at: '2026-01-01T10:00:00Z' }
const NOW = new Date('2026-11-16T12:00:00Z')
const stats: MyStats = { runes: 50000, playtime: null, streak: null, rank: null, punishment: null, unavailable: [] }

const rank = (group: string, name: string, prices: { days: number; runes: number }[]) => ({
  group,
  name,
  details: 'Szöveg.',
  gif_url: null,
  prefix_url: null,
  prices,
  season_ends_at: null,
  color: null,
})
const BOTH = [
  { days: 30, runes: 2000 },
  { days: 90, runes: 5000 },
]

let ranks = [rank('dragon', 'Dragon', BOTH), rank('mage', 'Mage', BOTH)]
let finishExit: () => void = () => {}
const originalGetAnimations = Element.prototype.getAnimations

beforeEach(() => {
  stubBrowserApis()
  vi.useFakeTimers({ shouldAdvanceTime: true, now: NOW })
  ranks = [rank('dragon', 'Dragon', BOTH), rank('mage', 'Mage', BOTH)]
  getMock.mockImplementation(async (url: string) => {
    if (url === '/auth/me') return { data: { data: account } }
    if (url === '/ranks') return { data: { data: ranks } }
    if (url === '/me/stats') return { data: { data: stats } }
    throw new Error(`unexpected GET ${url}`)
  })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  Element.prototype.getAnimations = originalGetAnimations
})

function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/rangok']}>
        <RanksPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** From now on every element runs an exit animation that lasts until finishExit(). */
function holdExitAnimations() {
  const finished = new Promise<void>((resolve) => (finishExit = resolve))
  const animation = { finished, effect: { getTiming: () => ({ duration: 170, iterations: 1 }) } }
  Element.prototype.getAnimations = () => [animation as unknown as Animation]
}

/** The player comes back to the tab a minute later: TanStack refetches the stale ['ranks'] query. */
async function refocusAfterAMinute() {
  await act(() => vi.advanceTimersByTimeAsync(61_000))
  await act(async () => {
    window.dispatchEvent(new Event('visibilitychange'))
  })
  await act(() => vi.advanceTimersByTimeAsync(50))
}

const text = (element: Element | null | undefined) => element?.textContent?.replace(/\s/g, ' ') ?? ''

describe('a dialog whose rank a refetch takes off sale', { timeout: 15_000 }, () => {
  it('repro: the closing "Mit kapsz?" dialog still shows the rank', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Mage' })
    fireEvent.click(screen.getByRole('button', { name: 'Tudj meg többet a rangról: Mage' }))
    await screen.findByRole('dialog')

    holdExitAnimations()
    ranks = [rank('dragon', 'Dragon', BOTH)]
    await refocusAfterAMinute()

    // Closing, not gone: the exit animation still runs.
    const closing = document.querySelector('[role="dialog"]')
    expect(closing).not.toBeNull()
    // Harm: an empty frame with only the corner X fades out.
    expect(within(closing as HTMLElement).queryByRole('heading', { name: 'Mage', hidden: true })).not.toBeNull()

    await act(async () => finishExit())
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('repro: the closing purchase popup keeps the duration it asked about, never "0 rúna"', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Dragon' })
    fireEvent.click(screen.getAllByRole('radio', { name: /90 nap/ })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Megveszem: Dragon, 90 nap' }))
    await screen.findByRole('alertdialog')

    holdExitAnimations()
    ranks = [rank('dragon', 'Dragon', [{ days: 30, runes: 2000 }]), rank('mage', 'Mage', BOTH)]
    await refocusAfterAMinute()

    const closing = document.querySelector('[role="alertdialog"]')
    expect(closing).not.toBeNull()
    expect(text(closing)).toContain('Dragon · 90 nap')
    expect(text(closing)).toContain('5000 rúna')
    expect(text(closing)).not.toMatch(/(^|\D)0 rúna/)

    await act(async () => finishExit())
    expect(document.querySelector('[role="alertdialog"]')).toBeNull()
  })

  it('control: Esc closes the dialog with its content until the animation ends', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Mage' })
    fireEvent.click(screen.getByRole('button', { name: 'Tudj meg többet a rangról: Mage' }))
    const dialog = await screen.findByRole('dialog')

    holdExitAnimations()
    fireEvent.keyDown(dialog, { key: 'Escape' })
    await act(() => vi.advanceTimersByTimeAsync(50))

    const closing = document.querySelector('[role="dialog"]')
    expect(closing).not.toBeNull()
    expect(within(closing as HTMLElement).queryByRole('heading', { name: 'Mage', hidden: true })).not.toBeNull()

    await act(async () => finishExit())
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })
})
