/**
 * Regression test (review 2026-11-24 VI-1, VI-6). The bugs it guards against, both at 320 px (measured with Playwright):
 * VI-1: the friends list's grid had no column template on phones, so a 16-letter name with a long rank label widened its
 * implicit column past the card and the whole page scrolled sideways (22 px); VI-6: "Rekord: 365 nap" broke between the
 * number and "nap". jsdom has no layout, so this pins the classes; the layout itself was measured with Playwright scripts kept outside the repo.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { FriendsCard } from '@/features/home/FriendsCard'
import { StreakPanel } from '@/features/home/StreakPanel'
import { OWN_WORDING } from '@/features/home/wording'
import { stubBrowserApis } from '@/test/fakeBackend'

beforeEach(stubBrowserApis)
afterEach(cleanup)

describe('the overview on a narrow phone', () => {
  it('gives the friends list one shrinkable column, so a long name is cut instead of widening the page', () => {
    render(
      <MemoryRouter>
        <FriendsCard
          title={OWN_WORDING.friends}
          emptyText={OWN_WORDING.noFriends}
          back={{ to: '/', label: 'Vissza a főoldalra' }}
          friends={[{ name: 'SuperLongName_99', online: true, has_profile: true, rank: { name: 'Tulajdonos', color: '#389A69' } }]}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('SuperLongName_99').closest('ul')?.className).toMatch(/(^| )grid-cols-1( |$)/)
  })

  it('keeps "Rekord: N nap" on one line', () => {
    render(<StreakPanel streak={{ current: 12, best: 365, week: Array(7).fill('future') }} text={OWN_WORDING.streak} asOf={new Date()} />)

    expect(screen.getByText(/^Rekord:/).className).toContain('whitespace-nowrap')
  })
})
