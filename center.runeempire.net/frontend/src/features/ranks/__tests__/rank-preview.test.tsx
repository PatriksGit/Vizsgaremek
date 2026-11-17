/**
 * "Játékbeli kinézet": the rank's prefix image before the player's name.
 * Review 2026-11-17, F4: a prefix that failed once is tried again when the
 * ranks refresh with a corrected address (a fixed upload in the management
 * section), instead of staying hidden until the page reloads.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Rank } from '@/features/ranks/api'
import { RankPreview } from '@/features/ranks/RankPreview'
import { stubBrowserApis } from '@/test/fakeBackend'

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api')>()
  return { ...original, http: { get: async () => ({ data: { data: null } }) } }
})

const rank = (prefixUrl: string): Rank => ({
  group: 'dragon', name: 'Dragon', details: '', gifUrl: null, prefixUrl, prices: [], seasonEndsAt: null, color: null, servers: [],
})
const client = new QueryClient()
const wrap = (node: ReactNode) => <QueryClientProvider client={client}>{node}</QueryClientProvider>

beforeEach(stubBrowserApis)
afterEach(cleanup)

describe('the rank preview', () => {
  it('a broken prefix is left out', () => {
    render(wrap(<RankPreview rank={rank('/rank_icons/broken.png')} />))
    fireEvent.error(screen.getByRole('img', { name: 'Dragon' }))

    expect(screen.queryByRole('img', { name: 'Dragon' })).toBeNull()
  })

  it('a corrected prefix address is shown again without a reload', () => {
    const { rerender } = render(wrap(<RankPreview rank={rank('/rank_icons/broken.png')} />))
    fireEvent.error(screen.getByRole('img', { name: 'Dragon' }))

    rerender(wrap(<RankPreview rank={rank('/rank_icons/dragon.png')} />))

    expect(screen.getByRole('img', { name: 'Dragon' }).getAttribute('src')).toBe('/rank_icons/dragon.png')
  })
})
