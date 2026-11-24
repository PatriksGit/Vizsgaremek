/**
 * Regression test (review 2026-11-24 UX-K5, the punishment trigger). The bug it guards against: the stat card wrapped its
 * value in a FitLine, and the punishment's HoverCard trigger (44 px tall below md) was that value, so the FitLine's zoom
 * shrank the whole button: 38.6-43 px at 652-700 px (Playwright). The trigger now wraps its own FitLine: only the text
 * shrinks. jsdom has no layout, so this pins the structure; a Playwright sweep kept outside the repo measured 320-767 px.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { PunishmentCard } from '@/features/home/PunishmentCard'
import { OWN_WORDING } from '@/features/home/wording'
import { stubBrowserApis } from '@/test/fakeBackend'

const ban = { kind: 'ban' as const, until: null, issuedAt: '2026-11-20T10:00:00Z', issuedBy: 'Konzol', reason: 'Teszt' }

/** FitLine's inner line: the element its zoom is set on. */
const FIT_LINE = 'span.w-max.whitespace-nowrap'

beforeEach(stubBrowserApis)
afterEach(cleanup)

describe('the punishment trigger keeps its tap height', () => {
  it('fits only the text inside the button, never the button itself', () => {
    render(
      <ul>
        <PunishmentCard label={OWN_WORDING.punishment} punishment={ban} />
      </ul>,
    )
    const trigger = screen.getByRole('button', { name: /Végleges/ })

    expect(trigger.closest(FIT_LINE)).toBeNull()
    expect(trigger.querySelector(FIT_LINE)?.textContent).toContain('Végleges')
    expect(trigger.className).toContain('max-md:min-h-11')
  })

  it('still fits "Nincsen" like the other cards when there is no trigger', () => {
    render(
      <ul>
        <PunishmentCard label={OWN_WORDING.punishment} punishment={null} />
      </ul>,
    )

    expect(screen.getByText('Nincsen').closest(FIT_LINE)).not.toBeNull()
  })
})
