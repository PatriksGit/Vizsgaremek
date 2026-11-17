/**
 * Regression test (review 2026-11-17, home H3). The bug it guards against: after a failed first load the Discord card offers "Újrapróbálás",
 * whose code shows "Próbálkozás…" (disabled, spinning) while it fetches. In TanStack Query v5 a
 * refetch of an errored query without data is `pending` again, so the card swaps the whole
 * button for the member skeleton: the clicked button leaves the page, focus falls to <body>,
 * and "Próbálkozás…" never shows.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { DiscordCard } from '@/features/home/DiscordCard'
import { stubBrowserApis } from '@/test/fakeBackend'

const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api')>()
  return { ...original, http: { get: getMock } }
})

const widget = { presence_count: 1, instant_invite: null, channels: [], members: [{ username: 'Anna', avatar_url: null, status: 'online', channel_id: null }] }

beforeEach(() => {
  stubBrowserApis()
})

afterEach(() => {
  cleanup()
})

/** Renders the card on a backend that fails once, then clicks "Újrapróbálás" while the second answer is held back. */
async function clickRetry() {
  let release: (value: unknown) => void = () => {}
  getMock.mockRejectedValueOnce(new Error('Discord down')).mockImplementationOnce(
    () => new Promise((resolve) => (release = resolve)),
  )
  render(
    <QueryClientProvider client={new QueryClient()}>
      <DiscordCard />
    </QueryClientProvider>,
  )
  const retry = await screen.findByRole('button', { name: 'Újrapróbálás' })
  retry.focus()
  fireEvent.click(retry)
  return { release: (value: unknown) => act(async () => release(value)) }
}

it('"Újrapróbálás" stays on screen, busy and focused, while it retries', async () => {
  await clickRetry()
  // While the second try runs, the player still sees the button they pressed, busy, with the focus on it.
  const busy = await screen.findByRole('button', { name: 'Próbálkozás…' })
  expect(busy).toHaveProperty('disabled', true)
  expect(document.activeElement).toBe(busy)
})

it('a retry that succeeds replaces the error with the members', async () => {
  const { release } = await clickRetry()
  await release({ data: { data: widget } })
  // The second try succeeds: the members replace the error, the button is gone.
  expect(await screen.findByText('Anna')).toBeTruthy()
  expect(screen.queryByRole('button', { name: /Újrapróbálás|Próbálkozás/ })).toBeNull()
})
