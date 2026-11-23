/**
 * Regression test (review 2026-11-23, ranks-players K3). A rank without a GIF (gif_url is nullable until the management
 * upload) showed the developer placeholder "A rang GIF-je ide kerül" to players. The strip now stays empty, its size kept.
 */
import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'

import type { Rank } from '@/features/ranks/api'
import { RankBanner } from '@/features/ranks/RankParts'

const dragon: Rank = { group: 'dragon', name: 'Dragon', details: '', gifUrl: null, prefixUrl: null, prices: [{ days: 30, runes: 1000 }], seasonEndsAt: null, color: null }

afterEach(cleanup)

it('repro: a rank without a GIF shows no placeholder text, only the empty strip', () => {
  const { container } = render(<RankBanner rank={dragon} />)

  expect(container.textContent).toBe('')
  expect(container.querySelector('img')).toBeNull()
  expect(container.firstElementChild?.classList.contains('aspect-5/2')).toBe(true)
})

it('control: a rank with a GIF shows it', () => {
  const { getByRole } = render(<RankBanner rank={{ ...dragon, gifUrl: '/ranks/dragon.gif' }} />)

  expect(getByRole('img', { name: 'Dragon rang animációja' }).getAttribute('src')).toBe('/ranks/dragon.gif')
})
