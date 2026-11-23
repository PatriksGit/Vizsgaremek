/**
 * Regression test (review 2026-11-23, home H1): a disposed 3D viewer's late skin answer still lands. SkinViewer3D's
 * effect never checks whether its viewer is still the current one, so the OLD viewer's loadSkin
 * finishing after the new one's sets shownKey back to the old key: the new figure stays hidden
 * (opacity-0) for good. Path: the window crosses the md breakpoint while the skin loads.
 *
 * Fakes only the edges: skinview3d (WebGL; jsdom has none) and matchMedia (the breakpoint).
 */
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { SkinFigure } from '@/features/home/SkinFigure'

type FakeViewer = { width: number; resolve: () => void; reject: () => void }

const viewers = vi.hoisted(() => [] as FakeViewer[])

vi.mock('skinview3d', () => {
  class SkinViewer {
    width: number
    controls = { enableZoom: true, enablePan: true }
    playerWrapper = { rotation: { y: 0 } }
    animation: unknown = null
    autoRotate = false
    autoRotateSpeed = 0
    resolve = () => {}
    reject = () => {}
    constructor(options: { width: number }) {
      this.width = options.width
      viewers.push(this as unknown as FakeViewer)
    }
    loadSkin() {
      return new Promise<void>((resolve, reject) => {
        this.resolve = resolve
        this.reject = reject
      })
    }
    // Like skinview3d 3.4: dispose() does not touch a pending loadSkin; its image still loads.
    dispose() {}
  }
  class IdleAnimation {}
  return { SkinViewer, IdleAnimation }
})

let mobile = false
const listeners = new Set<() => void>()

beforeEach(() => {
  viewers.length = 0
  mobile = false
  listeners.clear()
  window.matchMedia = ((query: string) => ({
    get matches() {
      return query.includes('max-width') ? mobile : false
    },
    media: query,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  })) as unknown as typeof window.matchMedia
})

afterEach(cleanup)

/** The figure, the window narrowed past 768 px while the first skin was still loading: two viewers. */
async function resizedWhileLoading() {
  viewers.length = 0
  mobile = false
  listeners.clear()
  const { container } = render(<SkinFigure name="Anna" />)
  await act(async () => {
    await vi.dynamicImportSettled()
  })
  mobile = true
  act(() => listeners.forEach((listener) => listener()))
  expect(viewers.map((viewer) => viewer.width)).toEqual([150, 84])
  return container
}

const shown = (container: HTMLElement) => container.querySelector('canvas')?.classList.contains('opacity-100')

it('repro: the old viewer\'s skin arriving after the new one\'s keeps the figure shown', async () => {
  for (let round = 0; round < 10; round++) {
    const container = await resizedWhileLoading()
    // The new viewer's skin arrives first, the disposed one's after it.
    await act(async () => viewers[1].resolve())
    await act(async () => viewers[0].resolve())
    expect(shown(container), `round ${round}`).toBe(true)
    cleanup()
  }
})

it('control: the skins arriving in order show the figure', async () => {
  for (let round = 0; round < 10; round++) {
    const container = await resizedWhileLoading()
    await act(async () => viewers[0].resolve())
    await act(async () => viewers[1].resolve())
    expect(shown(container), `round ${round}`).toBe(true)
    cleanup()
  }
})
