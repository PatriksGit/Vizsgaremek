/**
 * Regression test (review 2026-11-24, home HO-K3; advisor, 2026-11-24): a Discord widget with people online but an
 * empty member list showed "3 online" beside "Most senki sincs fent.". "Nobody is on" now shows only when nobody is
 * (presence_count 0); with people online and no list, only the count.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { DiscordCard } from '@/features/home/DiscordCard'
import { stubBrowserApis } from '@/test/fakeBackend'

const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api')>()
  return { ...original, http: { get: getMock } }
})

beforeEach(() => {
  stubBrowserApis()
})

afterEach(() => {
  cleanup()
})

async function card(presenceCount: number) {
  getMock.mockResolvedValue({ data: { data: { presence_count: presenceCount, instant_invite: null, members: [] } } })
  render(
    <QueryClientProvider client={new QueryClient()}>
      <DiscordCard />
    </QueryClientProvider>,
  )
  // The count beside "online" in the card's header: the widget answered.
  await screen.findByText(String(presenceCount))
}

it('people online without a member list: no "Most senki sincs fent."', async () => {
  await card(3)
  expect(screen.queryByText('Most senki sincs fent.')).toBeNull()
})

it('control: nobody online says so', async () => {
  await card(0)
  expect(screen.getByText('Most senki sincs fent.')).toBeTruthy()
})
