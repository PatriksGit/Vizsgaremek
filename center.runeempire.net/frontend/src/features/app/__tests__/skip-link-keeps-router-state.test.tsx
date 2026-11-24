/**
 * Review 2026-11-24 SH-2: the skip link "Ugrás a tartalomra" was a plain #tartalom fragment link. In a browser,
 * following it adds a history entry without the page's router state and fires a popstate that react-router takes
 * over, so a profile opened from the overview's friends turned "Vissza a főoldalra" into "Vissza a kereséshez".
 * jsdom does not turn the fragment click into a popstate, so this checks what keeps the browser from navigating:
 * the click is cancelled, the address keeps no #tartalom and the focus moves to the page itself.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { stubBrowserApis } from '@/test/fakeBackend'

vi.mock('@/features/home/SkinViewer3D', () => ({ default: () => null }))

const account = { uuid: 'u-1', username: 'skipuser', display_name: 'SkipUser', registered_at: null, can_manage: false }
const profile = {
  name: 'PatrikT',
  registered_at: '2026-10-01T09:30:00+00:00',
  runes: 1250,
  playtime: { total_seconds: 7200, week: [0, 0, 0, 0, 0, 0, 0] },
  streak: { current: 0, best: 0, week: ['missed', 'missed', 'missed', 'missed', 'missed', 'missed', 'pending'] },
  rank: { group: 'default', name: 'Játékos', expires_at: null, color: null },
  punishment: null,
  unavailable: [],
}

/** The whole app on a friend's profile opened from the overview (router state {back: home}). */
async function renderProfileFromHome() {
  vi.resetModules()
  const { installFakeBackend } = await import('@/test/fakeBackend')
  installFakeBackend({
    'GET /auth/me': () => ({ status: 200, data: { data: account } }),
    'GET /players/PatrikT/stats': () => ({ status: 200, data: { data: profile } }),
    'GET /players/PatrikT/friends': () => ({ status: 200, data: { data: [] } }),
    'GET /discord-widget': () => ({ status: 503 }),
  })
  // What react-router's own navigate(..., {state}) writes into the history entry.
  window.history.replaceState({ usr: { back: { to: '/', label: 'Vissza a főoldalra' } }, key: 'k1', idx: 0 }, '', '/jatekosok/PatrikT')
  const { default: App } = await import('@/App')
  render(<App />)
  expect(await screen.findByRole('link', { name: /Vissza a főoldalra/ })).toBeTruthy()
}

beforeEach(stubBrowserApis)
afterEach(cleanup)

describe('the skip link on a profile', { timeout: 15_000 }, () => {
  it('moves the focus to the page without navigating, so the profile keeps its back link', async () => {
    await renderProfileFromHome()

    // Enter on the focused skip link: a keyboard click (detail 0). fireEvent returns false when the click was cancelled.
    const followed = fireEvent.click(screen.getByRole('link', { name: 'Ugrás a tartalomra' }), { detail: 0 })

    expect(followed, 'the browser would follow #tartalom and drop the router state').toBe(false)
    expect(window.location.hash).toBe('')
    expect(document.activeElement).toBe(document.getElementById('tartalom'))
    expect(screen.getByRole('link', { name: /Vissza a főoldalra/ })).toBeTruthy()
  })

  it('control: a click on the page that is no navigation keeps the back link', async () => {
    await renderProfileFromHome()

    fireEvent.click(screen.getByRole('heading', { level: 1, name: 'PatrikT' }))

    expect(screen.getByRole('link', { name: /Vissza a főoldalra/ })).toBeTruthy()
  })
})
