/**
 * Regression test (review 2026-11-23, ranks-players RP2): a search answered well ("pa" -> PaBlo, Patrik) is refreshed in the
 * background a minute later (the player comes back to the tab; staleTime 60 s,
 * refetchOnWindowFocus). The refresh is refused (429) or the connection drops:
 * the results the player was reading vanish and only the error text is left,
 * although the last good answer is still in the cache.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PlayersPage } from '@/features/players/PlayersPage'
import { ApiError } from '@/lib/api'
import { stubBrowserApis } from '@/test/fakeBackend'

const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api')>()
  return { ...original, http: { get: getMock } }
})

const answer = { data: { data: [{ name: 'PaBlo' }, { name: 'Patrik' }], meta: { more: 0 } } }

beforeEach(() => {
  stubBrowserApis()
  vi.useFakeTimers({ shouldAdvanceTime: true, now: new Date('2026-11-23T12:00:00Z') })
  getMock.mockReset()
  getMock.mockResolvedValue(answer)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

async function searchPa() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/jatekosok']}>
        <Routes>
          <Route path="jatekosok" element={<PlayersPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  fireEvent.change(screen.getByRole('searchbox', { name: 'Játékosnév' }), { target: { value: 'pa' } })
  await act(() => vi.advanceTimersByTimeAsync(300))
  const list = await screen.findByRole('list', { name: 'Találatok' })
  expect(within(list).getAllByRole('link').map((link) => link.textContent)).toEqual(['PaBlo', 'Patrik'])
}

/** A minute later the player comes back to the tab: TanStack refetches the stale search. */
async function refocusAfterAMinute() {
  await act(() => vi.advanceTimersByTimeAsync(61_000))
  await act(async () => {
    window.dispatchEvent(new Event('visibilitychange'))
  })
  await act(() => vi.advanceTimersByTimeAsync(50))
}

describe('RP2: a failed background refresh of an answered search', { timeout: 15_000 }, () => {
  it('repro: keeps the results it already shows', async () => {
    await searchPa()

    getMock.mockRejectedValue(new ApiError(429, 'Túl sok próbálkozás. Próbáld újra 1 perc múlva.', {}, { code: 'too_many_requests' }))
    await refocusAfterAMinute()

    expect(getMock).toHaveBeenCalledTimes(2) // it did refresh
    // Harm: the list is gone; only "Túl sok próbálkozás. …" is left on the page.
    expect(screen.queryByRole('list', { name: 'Találatok' })).not.toBeNull()
  })

  it('control: a refresh that succeeds keeps the results', async () => {
    await searchPa()

    await refocusAfterAMinute()

    expect(getMock).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('list', { name: 'Találatok' })).not.toBeNull()
  })
})
