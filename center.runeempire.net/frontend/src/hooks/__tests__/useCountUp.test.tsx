import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { ServerStatus } from '@/components/ServerStatus'

import { installFakeBackend, stubBrowserApis } from '@/test/fakeBackend'

let online = 12

function discordBackend() {
  installFakeBackend({
    'GET /discord-widget': () => ({
      status: 200,
      data: { data: { presence_count: online, instant_invite: null, channels: [], members: [] } },
    }),
  })
}

/** The number a sighted visitor sees (the sr-only copy holds the final count). */
function shownCount(container: HTMLElement) {
  return Number(container.querySelector('strong span[aria-hidden="true"]')?.textContent)
}

async function advance(ms: number) {
  await act(() => vi.advanceTimersByTimeAsync(ms))
}

async function renderStatusAndLetItCount() {
  const queryClient = new QueryClient()
  const { container } = render(
    <QueryClientProvider client={queryClient}>
      <ServerStatus />
    </QueryClientProvider>,
  )
  await advance(50)
  await advance(2000)
  expect(shownCount(container)).toBe(12)
  return { container, queryClient }
}

/** What the widget query's refetchInterval (60 s) does every minute. */
async function nextMinutesRefetch(queryClient: QueryClient) {
  await act(() => queryClient.refetchQueries({ queryKey: ['discord-widget'] }))
}

describe('the Discord online count on the login page', () => {
  beforeAll(stubBrowserApis)
  beforeEach(() => {
    online = 12
    discordBackend()
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'],
    })
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('a refetch with the same count leaves the number alone', async () => {
    const { container, queryClient } = await renderStatusAndLetItCount()

    await nextMinutesRefetch(queryClient)
    await advance(100)

    expect(shownCount(container)).toBe(12)
  })

  it('a refetch where one more member came online does not drop the number back to 0', async () => {
    const { container, queryClient } = await renderStatusAndLetItCount()

    online = 13
    await nextMinutesRefetch(queryClient)
    await advance(100)

    // "Counts from 0 up to target once": 12 -> 13 must not pass through 0..11 again.
    expect(shownCount(container)).toBeGreaterThanOrEqual(12)
  })
})
