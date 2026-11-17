/**
 * The error page (owner, 2026-11-17, like Pterodactyl's): when the session check only fails,
 * the site shows the status code large on top, one line of what happened, and how to reach
 * us. No retry button: refreshing the page asks again. A dropped connection has no code.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { AxiosError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { stubBrowserApis, type Reply } from '@/test/fakeBackend'

/** The whole app on a backend whose session check answers `me`, a fresh copy per test. */
async function renderAppWithMe(me: () => Reply) {
  vi.resetModules()
  const { installFakeBackend } = await import('@/test/fakeBackend')
  installFakeBackend({ 'GET /auth/me': me })
  window.history.pushState({}, '', '/')
  const { default: App } = await import('@/App')
  render(<App />)
}

beforeEach(stubBrowserApis)
afterEach(cleanup)

// The whole app renders here: give it the whole-app timeout (frontend CLAUDE.md, Tests).
describe('the error page', { timeout: 15_000 }, () => {
  it('a server error shows 500 and says something went wrong', async () => {
    await renderAppWithMe(() => ({ status: 500, data: { message: 'Váratlan hiba történt.', code: 'server_error' } }))

    expect(await screen.findByRole('heading', { name: 'Valami hiba történt' })).toBeTruthy()
    expect(screen.getByText('500')).toBeTruthy()
    expect(screen.getByText('Hibakód: 500')).toBeTruthy()
    expect(screen.getByText(/Frissítsd az oldalt/)).toBeTruthy()
  })

  it('an unreachable server shows its code and says it is not available', async () => {
    await renderAppWithMe(() => ({ status: 503 }))

    expect(await screen.findByRole('heading', { name: 'A szerver most nem érhető el' })).toBeTruthy()
    expect(screen.getByText('503')).toBeTruthy()
  })

  it('a dropped connection has no code and points at the connection', async () => {
    await renderAppWithMe(() => {
      throw new AxiosError('Network Error', AxiosError.ERR_NETWORK)
    })

    expect(await screen.findByRole('heading', { name: 'Nem sikerült csatlakozni' })).toBeTruthy()
    expect(screen.queryByText(/Hibakód/)).toBeNull()
  })

  it('offers Discord, and no retry button (a page refresh asks again)', async () => {
    await renderAppWithMe(() => ({ status: 500 }))

    await screen.findByRole('heading', { name: 'Valami hiba történt' })
    expect(screen.getByRole('link', { name: /Discord/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Újrapróbálás/ })).toBeNull()
  })
})
