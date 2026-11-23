/**
 * Regression test (review 2026-11-23, home H1, path 2): a profile opened by a hand-typed link in another case
 * (/jatekosok/patrikt) builds the 3D figure for the URL's spelling, then, when the stats answer
 * "PatrikT", a second viewer for that spelling. The first viewer's skin failing late runs
 * SkinViewer3D's useEffectEvent `fail`, i.e. the LATEST onError: the working figure is swapped
 * for the CSS Steve.
 *
 * Fakes only the edges: the API (vi.mock('@/lib/api')) and skinview3d (WebGL; jsdom has none).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { PlayerProfilePage } from '@/features/players/PlayerProfilePage'
import { stubBrowserApis } from '@/test/fakeBackend'

type FakeViewer = { url: string; resolve: () => void; reject: () => void }

const viewers = vi.hoisted(() => [] as FakeViewer[])
const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api')>()
  return { ...original, http: { get: getMock } }
})

vi.mock('skinview3d', () => {
  class SkinViewer {
    url = ''
    controls = { enableZoom: true, enablePan: true }
    playerWrapper = { rotation: { y: 0 } }
    animation: unknown = null
    autoRotate = false
    autoRotateSpeed = 0
    resolve = () => {}
    reject = () => {}
    constructor() {
      viewers.push(this as unknown as FakeViewer)
    }
    loadSkin(url: string) {
      this.url = url
      return new Promise<void>((resolve, reject) => {
        this.resolve = resolve
        this.reject = () => reject(new Error('skin failed'))
      })
    }
    dispose() {}
  }
  class IdleAnimation {}
  return { SkinViewer, IdleAnimation }
})

const profile = {
  name: 'PatrikT',
  registered_at: '2026-10-01T09:30:00+00:00',
  runes: 0,
  playtime: { total_seconds: 0, week: [0, 0, 0, 0, 0, 0, 0] },
  streak: { current: 0, best: 0, week: ['missed', 'missed', 'missed', 'missed', 'missed', 'missed', 'pending'] },
  rank: { group: 'default', name: 'Játékos', expires_at: null, color: null },
  punishment: null,
  unavailable: [],
}

let answerStats: () => void = () => {}

beforeEach(() => {
  stubBrowserApis()
  viewers.length = 0
  getMock.mockReset()
  getMock.mockImplementation((url: string) => {
    if (url.endsWith('/stats')) return new Promise((resolve) => (answerStats = () => resolve({ data: { data: profile } })))
    if (url.endsWith('/friends')) return Promise.resolve({ data: { data: [] } })
    return Promise.reject(new Error(`no ${url} in this test`))
  })
})

afterEach(cleanup)

async function openProfile(path: string) {
  const { container } = render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="jatekosok/:name" element={<PlayerProfilePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await act(async () => {
    await vi.dynamicImportSettled()
  })
  return container
}

const figureShown = (container: HTMLElement) => container.querySelector('canvas')?.classList.contains('opacity-100') ?? false

it('repro: the replaced viewer\'s late failure keeps the 3D figure, no CSS Steve', async () => {
  const container = await openProfile('/jatekosok/patrikt')
  // The stats answer with the name's real spelling: a second viewer, for that skin.
  await act(async () => {
    answerStats()
    await new Promise((resolve) => setTimeout(resolve, 20))
  })
  expect(viewers.map((viewer) => viewer.url)).toEqual(['/api/players/patrikt/skin', '/api/players/PatrikT/skin'])
  // The new viewer's skin is on; then the first, disposed viewer's skin request fails.
  await act(async () => viewers[1].resolve())
  await act(async () => viewers[0].reject())
  expect(figureShown(container)).toBe(true)
})

it('repro: the replaced viewer\'s late success keeps the figure shown', async () => {
  const container = await openProfile('/jatekosok/patrikt')
  await act(async () => {
    answerStats()
    await new Promise((resolve) => setTimeout(resolve, 20))
  })
  expect(viewers.map((viewer) => viewer.url)).toEqual(['/api/players/patrikt/skin', '/api/players/PatrikT/skin'])
  // Two URLs, so the answers come in any order: the new skin first, the disposed viewer's after it.
  await act(async () => viewers[1].resolve())
  await act(async () => viewers[0].resolve())
  expect(figureShown(container)).toBe(true)
})

it('control: one spelling, one viewer, the figure shows', async () => {
  const container = await openProfile('/jatekosok/PatrikT')
  await act(async () => {
    answerStats()
    await new Promise((resolve) => setTimeout(resolve, 20))
  })
  expect(viewers.map((viewer) => viewer.url)).toEqual(['/api/players/PatrikT/skin'])
  await act(async () => viewers[0].resolve())
  expect(figureShown(container)).toBe(true)
})
