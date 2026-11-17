/**
 * The punishment card's details (Kapta / Kiosztotta / Indok). Review 2026-11-17, UI-N1: Base UI's
 * preview card opens only on a mouse hover or a keyboard focus, so on a phone a tap never opened
 * it and a muted or banned player could not read why. A tap now toggles it, a mouse click keeps
 * the card its hover opened, and Enter opens it. The hover itself is checked in a real browser.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { PunishmentCard } from '@/features/home/PunishmentCard'
import { stubBrowserApis } from '@/test/fakeBackend'

const mute = {
  kind: 'mute' as const,
  until: '2026-11-22T10:00:00Z',
  issuedAt: '2026-11-15T10:00:00Z',
  issuedBy: 'ModeratorX',
  reason: 'Spam a chaten',
}

function renderCard() {
  render(
    <ul>
      <PunishmentCard punishment={mute} />
    </ul>,
  )
  return screen.getByRole('button', { name: /Némítva eddig/ })
}

/**
 * A press as the browser sends it: pointerdown with its pointer type, then the click. jsdom has no
 * PointerEvent, so the pointer type is set on a plain event (React reads it from there).
 */
function press(button: HTMLElement, pointerType: 'touch' | 'mouse') {
  fireEvent(button, Object.assign(new Event('pointerdown', { bubbles: true }), { pointerType }))
  fireEvent.click(button)
}

const reasonShown = () => screen.queryByText('Spam a chaten') !== null

beforeEach(stubBrowserApis)
afterEach(cleanup)

describe('the punishment details', () => {
  it('a tap opens them, and a second tap closes them', async () => {
    const button = renderCard()

    press(button, 'touch')
    expect(await screen.findByText('Spam a chaten')).toBeTruthy()

    press(button, 'touch')
    await expect.poll(reasonShown).toBe(false)
  })

  it('a mouse click keeps them open', async () => {
    const button = renderCard()

    press(button, 'mouse')
    expect(await screen.findByText('Spam a chaten')).toBeTruthy()

    press(button, 'mouse')
    expect(reasonShown()).toBe(true)
  })

  it('Enter (a click without a pointer) opens them and keeps them open', async () => {
    const button = renderCard()

    fireEvent.click(button)
    expect(await screen.findByText('Spam a chaten')).toBeTruthy()

    fireEvent.click(button)
    expect(reasonShown()).toBe(true)
  })
})
