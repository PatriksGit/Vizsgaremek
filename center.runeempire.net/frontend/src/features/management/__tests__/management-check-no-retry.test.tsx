/**
 * Regression test (frontend review 2026-11-23).
 * AM-6: the Management rule says /api/management/me is never retried (every call slides the
 * 30-minute grant). useManagementMe sets retry: false, but useOpenManagement's fetchQuery does
 * not, so it takes the app's default (src/queryClient.ts: retry network errors and 5xx twice):
 * a 500 is asked three times, and the tap waits ~3 s (1 s + 2 s back-off) before its toast.
 * Uses the app's own queryClient.
 */
import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { AccountPage } from '@/features/account/AccountPage'
import type { Account } from '@/features/auth/api'
import { queryClient } from '@/queryClient'
import { installFakeBackend, stubBrowserApis, type Reply } from '@/test/fakeBackend'

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', async (importOriginal) => ({ ...(await importOriginal<typeof import('sonner')>()), toast: toastMock }))

const ACCOUNT: Account = {
  uuid: 'u-1',
  username: 'steve_01',
  display_name: 'Steve_01',
  email: 'steve@example.com',
  two_factor_enabled: false,
  can_manage: true,
  registered_at: '2026-01-01T00:00:00Z',
}

beforeAll(stubBrowserApis)
beforeEach(() => {
  vi.stubGlobal('location', { ...window.location, replace: vi.fn(), assign: vi.fn() })
})
afterEach(() => {
  cleanup()
  queryClient.clear()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

function tapWith(me: Reply) {
  const calls = installFakeBackend({
    'GET /auth/me': () => ({ status: 200, data: { data: ACCOUNT } }),
    'GET /management/me': () => me,
    // The sidebar's peek stays unanswered: these tests are about the frame's and the menu's own asks.
    'GET /management/me?peek=1': () => new Promise<never>(() => {}),
  })
  queryClient.setQueryData(['account'], ACCOUNT)
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/beallitasok']}>
        <AccountPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  fireEvent.click(screen.getByRole('link', { name: 'Megnyitás' }))
  return () => calls.filter((call) => call === 'GET /management/me').length
}

it('repro: a 5xx check is asked once, not retried', { timeout: 15_000 }, async () => {
  const meCalls = tapWith({ status: 500, data: { message: 'Server Error' } })
  await waitFor(() => expect(toastMock.error).toHaveBeenCalled(), { timeout: 8_000 })

  expect(meCalls()).toBe(1)
})

it('control: a 4xx check is asked once', { timeout: 15_000 }, async () => {
  const meCalls = tapWith({ status: 403, data: { message: 'Ehhez nincs jogosultságod.', code: 'management.forbidden' } })
  await waitFor(() => expect(toastMock.error).toHaveBeenCalled(), { timeout: 8_000 })

  expect(meCalls()).toBe(1)
})
