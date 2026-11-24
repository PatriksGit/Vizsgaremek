/**
 * Review 2026-11-24 RK-2: "pa" is answered (PaBlo, Patrik); a minute later its background refresh is refused (429), and the page keeps
 * the answer (RP2). The player types on to "pat": until the box's 250 ms debounce asks for "pat", the page showed the
 * refused refresh's error in place of Patrik, a name the kept "pa" answer already holds (resultsFor lets it through).
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
const refused = new ApiError(429, 'Túl sok próbálkozás. Próbáld újra 1 perc múlva.', {}, { code: 'too_many_requests' })

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

const type = (text: string) => fireEvent.change(screen.getByRole('searchbox', { name: 'Játékosnév' }), { target: { value: text } })

async function searchPaThenRefresh(refreshFails: boolean) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/jatekosok']}>
        <Routes>
          <Route path="jatekosok" element={<PlayersPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  type('pa')
  await act(() => vi.advanceTimersByTimeAsync(300))
  await screen.findByRole('list', { name: 'Találatok' })

  if (refreshFails) getMock.mockRejectedValue(refused)
  await act(() => vi.advanceTimersByTimeAsync(61_000))
  await act(async () => {
    window.dispatchEvent(new Event('visibilitychange'))
  })
  await act(() => vi.advanceTimersByTimeAsync(50))
  expect(getMock).toHaveBeenCalledTimes(2) // the refresh did run
  expect(screen.queryByRole('list', { name: 'Találatok' })).not.toBeNull() // RP2: the answer is kept
}

describe('typing on after a refused background refresh', { timeout: 15_000 }, () => {
  it('the kept answer still narrows while the debounce waits', async () => {
    await searchPaThenRefresh(true)
    type('pat')
    await act(() => vi.advanceTimersByTimeAsync(100)) // before the 250 ms debounce asks for "pat"

    // Harm: "Túl sok próbálkozás. …" stands where Patrik was.
    expect(screen.queryByRole('alert')).toBeNull()
    const list = screen.getByRole('list', { name: 'Találatok' })
    expect(within(list).getAllByRole('link').map((link) => link.textContent)).toEqual(['Patrik'])
  })

  it('control: after a good refresh, typing on narrows the answer at once', async () => {
    await searchPaThenRefresh(false)
    type('pat')
    await act(() => vi.advanceTimersByTimeAsync(100))

    expect(screen.queryByRole('alert')).toBeNull()
    const list = screen.getByRole('list', { name: 'Találatok' })
    expect(within(list).getAllByRole('link').map((link) => link.textContent)).toEqual(['Patrik'])
  })
})
