/**
 * Regression test (review 2026-11-24 SH-3). The bug it guards against: on /runak the "Hamarosan" label sat beside the
 * card's text, so at 768-1024 px (sidebar shown) the text column was 35-42 px, one word per line, words spilled out of it
 * and the two cards of a row differed in height (Playwright). "Hamarosan" is now a Pill by the title (like the sidebar's)
 * and the card fills its grid cell. jsdom has no layout, so this pins the structure; the browser guard is
 * sh3-section-cards.js.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, it } from 'vitest'

import { NAV } from '@/features/app/nav'
import { SectionPage } from '@/features/app/SectionPage'

afterEach(cleanup)

it('puts "Hamarosan" by the card\'s title and lets the card fill its cell', () => {
  const runes = NAV.find((item) => item.children?.some((child) => child.comingSoon))!
  const soon = runes.children!.find((child) => child.comingSoon)!
  render(
    <MemoryRouter>
      <SectionPage item={runes} />
    </MemoryRouter>,
  )
  const title = screen.getByText(soon.label)
  const pills = screen.getAllByText('Hamarosan')

  expect(pills.some((pill) => pill.parentElement === title.parentElement)).toBe(true)
  expect(title.closest('li')?.firstElementChild?.className).toContain('h-full')
})
