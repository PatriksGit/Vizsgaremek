/**
 * Review 2026-11-24 SH-1: the error page shown while the session check only fails changed its text and code
 * while the check is asked again (the player comes back to the tab). TanStack v5 clears `error`
 * when a query without data refetches, so RootLayout passed no status and the page said
 * "Valami hiba történt" with the red "!" instead of "503 / A szerver most nem érhető el".
 */
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { stubBrowserApis, type Reply } from '@/test/fakeBackend'

/** The whole app on a backend whose session check answers `me`; returns TanStack's focus manager of that copy. */
async function renderAppWithMe(me: () => Reply | Promise<Reply>) {
  vi.resetModules()
  const { installFakeBackend } = await import('@/test/fakeBackend')
  installFakeBackend({ 'GET /auth/me': me })
  window.history.pushState({}, '', '/')
  const { default: App } = await import('@/App')
  const { focusManager } = await import('@tanstack/react-query')
  render(<App />)
  return focusManager
}

/** The player leaves the tab and comes back: the session check is asked again. */
function comeBackToTheTab(focusManager: { setFocused: (focused?: boolean) => void }) {
  act(() => {
    focusManager.setFocused(false)
    focusManager.setFocused(true)
  })
}

beforeEach(stubBrowserApis)
afterEach(cleanup)

describe('the error page while the session check is asked again', { timeout: 15_000 }, () => {
  it('keeps the 503 page while the re-check is on its way', async () => {
    let calls = 0
    const focusManager = await renderAppWithMe(() => {
      calls += 1
      // The first check: 503. The re-check: still on its way (a backend that is down answers slowly).
      return calls === 1 ? { status: 503 } : new Promise<Reply>(() => {})
    })
    expect(await screen.findByRole('heading', { name: 'A szerver most nem érhető el' })).toBeTruthy()

    comeBackToTheTab(focusManager)
    await vi.waitFor(() => expect(calls).toBe(2))

    // Nothing new is known yet: the page should still say what the last answer said.
    expect(screen.queryByRole('heading', { name: 'Valami hiba történt' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'A szerver most nem érhető el' })).toBeTruthy()
    expect(screen.getByText('Hibakód: 503')).toBeTruthy()
  })

  it('control: the 503 page after the re-check answered 503 again', async () => {
    let calls = 0
    const focusManager = await renderAppWithMe(() => {
      calls += 1
      return { status: 503 }
    })
    expect(await screen.findByRole('heading', { name: 'A szerver most nem érhető el' })).toBeTruthy()

    comeBackToTheTab(focusManager)
    await vi.waitFor(() => expect(calls).toBe(2))

    expect(await screen.findByRole('heading', { name: 'A szerver most nem érhető el' })).toBeTruthy()
    expect(screen.getByText('Hibakód: 503')).toBeTruthy()
  })
})
