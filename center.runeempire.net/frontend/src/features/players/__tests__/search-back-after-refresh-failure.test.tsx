/**
 * Regression test (review 2026-11-23, ranks-players RP2, path 2): the player opens a profile from the results and,
 * more than a minute later, comes back with "Vissza a kereséshez". The
 * remounted page refetches the stale search; that refresh is refused (429):
 * the cached results are replaced by the error text.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PlayersPage } from '@/features/players/PlayersPage'
import { profileBack } from '@/features/players/links'
import { ApiError } from '@/lib/api'
import { stubBrowserApis } from '@/test/fakeBackend'

const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api')>()
  return { ...original, http: { get: getMock } }
})

const answer = { data: { data: [{ name: 'PaBlo' }, { name: 'Patrik' }], meta: { more: 0 } } }

/** Stands in for the profile page: only its back link (the real profileBack). */
function ProfileStub() {
  const back = profileBack(useLocation().state)
  return <Link to={back.to}>{back.label}</Link>
}

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

async function searchThenOpenAProfile() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/jatekosok']}>
        <Routes>
          <Route path="jatekosok" element={<PlayersPage />} />
          <Route path="jatekosok/:name" element={<ProfileStub />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  fireEvent.change(screen.getByRole('searchbox', { name: 'Játékosnév' }), { target: { value: 'pa' } })
  await act(() => vi.advanceTimersByTimeAsync(300))
  const list = await screen.findByRole('list', { name: 'Találatok' })
  fireEvent.click(within(list).getByRole('link', { name: 'Patrik' }))
  await screen.findByRole('link', { name: 'Vissza a kereséshez' })
  await act(() => vi.advanceTimersByTimeAsync(61_000))
}

async function goBackToTheSearch() {
  fireEvent.click(screen.getByRole('link', { name: 'Vissza a kereséshez' }))
  await act(() => vi.advanceTimersByTimeAsync(50))
}

describe('RP2 path 2: back from a profile a minute later', { timeout: 15_000 }, () => {
  it('repro: a refused refresh keeps the results', async () => {
    await searchThenOpenAProfile()
    getMock.mockRejectedValue(new ApiError(429, 'Túl sok próbálkozás. Próbáld újra 1 perc múlva.', {}, { code: 'too_many_requests' }))

    await goBackToTheSearch()

    expect(getMock).toHaveBeenCalledTimes(2) // the remount refreshed the stale search
    // Harm: the results the player came back to are gone; only the error text is shown.
    expect(screen.queryByRole('list', { name: 'Találatok' })).not.toBeNull()
  })

  it('control: a refresh that succeeds shows the results', async () => {
    await searchThenOpenAProfile()

    await goBackToTheSearch()

    expect(getMock).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('list', { name: 'Találatok' })).not.toBeNull()
  })
})
