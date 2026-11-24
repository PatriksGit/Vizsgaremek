/**
 * Hostile and odd API values on the overview (review 2026-11-17): a javascript: Discord invite,
 * hostile friend names and rank colours, the streak's "Ma" across time zones, and a punishment
 * ending after the year 9999. Each `it` is one case.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { DiscordCard } from '@/features/home/DiscordCard'
import { FriendsCard } from '@/features/home/FriendsCard'
import { HomePage } from '@/features/home/HomePage'
import { OWN_WORDING } from '@/features/home/wording'
import { stubBrowserApis } from '@/test/fakeBackend'

const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api')>()
  return { ...original, http: { get: getMock } }
})
vi.mock('@/features/home/SkinViewer3D', () => ({ default: () => null }))

const account = { uuid: '00000000-0000-0000-0000-000000000079', username: 'hostile', display_name: 'Hostile', registered_at: '2026-01-01T10:00:00Z' }

const stats = {
  runes: 0,
  playtime: { total_seconds: 0, week: [0, 0, 0, 0, 0, 0, 0] },
  streak: { current: 0, best: 0, week: ['missed', 'missed', 'missed', 'missed', 'missed', 'missed', 'pending'] },
  rank: { group: 'default', name: 'Játékos', expires_at: null, color: null },
  punishment: null,
  unavailable: [],
}

function serve(overrides: Record<string, unknown>) {
  getMock.mockImplementation(async (url: string) => {
    if (url === '/auth/me') return { data: { data: account } }
    if (url in overrides) return { data: { data: overrides[url] } }
    if (url === '/me/stats') return { data: { data: stats } }
    if (url === '/me/friends') return { data: { data: [] } }
    if (url === '/discord-widget') throw new Error('down')
    throw new Error(`unexpected GET ${url}`)
  })
}

function renderWithClient(node: React.ReactNode) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  stubBrowserApis()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.stubEnv('TZ', 'Europe/Budapest')
})

it('javascript: invite from the Discord widget is not a live link', async () => {
  serve({ '/discord-widget': { presence_count: 0, instant_invite: 'javascript:alert(document.cookie)', channels: [], members: [] } })
  renderWithClient(<DiscordCard />)
  await screen.findByText('Most senki sincs fent.')
  const link = screen.getByRole('link', { name: /Csatlakozás a Discordhoz/ })
  expect(link.getAttribute('href')).toBe("javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')")
})

it('hostile friend names and rank colours stay text and drop out of style', () => {
  const long = 'W'.repeat(200)
  render(
    <MemoryRouter>
      <FriendsCard
        title={OWN_WORDING.friends}
        emptyText={OWN_WORDING.noFriends}
        back={{ to: '/', label: 'Vissza a főoldalra' }}
        friends={[
          { name: '<img src=x onerror=alert(1)>', online: true, has_profile: true, rank: { name: '<b>x</b>', color: 'red; background-image: url(https://evil.invalid/x)' } },
          { name: '‮evil​', online: false, has_profile: true, rank: null },
          { name: long, online: false, has_profile: true, rank: { name: 'Játékos', color: null } },
        ]}
      />
    </MemoryRouter>,
  )
  // The profile link carries the name encoded: it stays one path segment.
  expect(screen.getByText('<img src=x onerror=alert(1)>').closest('a')?.getAttribute('href')).toBe(
    '/jatekosok/%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E',
  )
  expect(document.querySelector('img[src="x"]')).toBeNull()
  expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeTruthy()
  const label = screen.getByText('<b>x</b>')
  expect(label.getAttribute('style') ?? '').not.toContain('evil.invalid')
  expect(screen.getByText(long).className).toContain('truncate')
  // Heads ask the backend with the name encoded, never another path.
  const srcs = [...document.querySelectorAll('img')].map((img) => img.getAttribute('src'))
  expect(srcs.every((src) => src?.startsWith('/api/players/') && src.endsWith('/skin') && src.split('/').length === 5)).toBe(true)
})

for (const [zone, instant, today] of [
  // Chile springs forward at 00:00 on Sunday 2026-09-06: local midnight does not exist.
  ['America/Santiago', '2026-09-06T10:00:00Z', 'Vasárnap (09.06)'],
  ['Pacific/Kiritimati', '2026-11-15T22:30:00Z', 'Vasárnap (11.15)'],
  ['Pacific/Pago_Pago', '2026-11-15T23:30:00Z', 'Hétfő (11.16)'],
  // Budapest's own autumn change, Sunday 2026-10-25 03:00 -> 02:00.
  ['Europe/Budapest', '2026-10-25T01:30:00Z', 'Vasárnap (10.25)'],
] as const) {
  it(`the streak's "Ma" is the Budapest day in ${zone}`, async () => {
    vi.stubEnv('TZ', zone)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(instant))
    serve({})
    renderWithClient(<HomePage />)
    const streak = screen.getByRole('list', { name: 'Napi sorozat ezen a héten' })
    await waitFor(() => expect(streak.getAttribute('aria-busy')).toBe('false'))
    const text = within(streak).getByText('Ma').closest('li')?.querySelector('.sr-only')?.textContent
    expect(text?.startsWith(today)).toBe(true)
  }, 15_000)
}

it('a punishment ending after the year 9999 (Carbon writes "10000-...") shows a dash, not NaN', async () => {
  serve({ '/me/stats': { ...stats, punishment: { kind: 'ban', until: '10000-01-01T00:00:00+00:00', issued_at: '2026-11-14T10:00:00+00:00', issued_by: 'Admin', reason: 'x' } } })
  renderWithClient(<HomePage />)
  const card = (await screen.findByText('Büntetéseid')).closest('li') as HTMLElement
  await waitFor(() => expect(within(card).getByRole('button').textContent).toContain('—'))
  expect(within(card).getByRole('button').textContent).not.toContain('NaN')
}, 15_000)
