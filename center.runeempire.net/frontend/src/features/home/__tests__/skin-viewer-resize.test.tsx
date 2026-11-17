/**
 * Regression test (review 2026-11-17, home H4). The bug it guards against: SkinViewer3D hides its canvas until the skin is on the figure
 * ("so no blank or default figure shows first"), but remembers that by URL only. Crossing the
 * md breakpoint (a resize, a tablet turned) changes width/height, so the effect disposes the
 * viewer and builds a new, skinless one on the same canvas while shownUrl still equals url:
 * the empty canvas stays visible until the new viewer's skin arrives.
 *
 * Fakes only the edges: skinview3d (WebGL; jsdom has none) and matchMedia (the breakpoint).
 */
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { SkinFigure } from '@/features/home/SkinFigure'

type FakeViewer = { width: number; disposed: boolean; skinLoaded: () => Promise<void> }

const viewers = vi.hoisted(() => [] as FakeViewer[])

vi.mock('skinview3d', () => {
  class SkinViewer {
    width: number
    disposed = false
    controls = { enableZoom: true, enablePan: true }
    playerWrapper = { rotation: { y: 0 } }
    animation: unknown = null
    autoRotate = false
    autoRotateSpeed = 0
    skinLoaded: () => Promise<void> = async () => {}
    constructor(options: { width: number }) {
      this.width = options.width
      viewers.push(this as unknown as FakeViewer)
    }
    loadSkin() {
      return new Promise<void>((resolve) => {
        this.skinLoaded = async () => resolve()
      })
    }
    dispose() {
      this.disposed = true
    }
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

afterEach(() => {
  cleanup()
})

/** Whether the canvas is faded in (visible) or still hidden. */
function canvasShown(canvas: Element) {
  return canvas.classList.contains('opacity-100')
}

async function loadFigure() {
  const { container } = render(<SkinFigure name="Anna" />)
  await act(async () => {
    await vi.dynamicImportSettled()
  })
  await screen.findByText((_, element) => element?.tagName === 'CANVAS')
  const canvas = container.querySelector('canvas') as HTMLCanvasElement
  return canvas
}

it('crossing the breakpoint hides the new viewer until its skin is on', async () => {
  const canvas = await loadFigure()
  await act(() => viewers[0].skinLoaded())
  expect(canvasShown(canvas)).toBe(true)

  // The window narrows past 768 px: a new viewer at 84x150, its skin not on it yet.
  mobile = true
  act(() => listeners.forEach((listener) => listener()))
  expect(viewers).toHaveLength(2)
  expect(viewers[0].disposed).toBe(true)
  expect(viewers[1].width).toBe(84)
  // Until the new viewer has the skin, the canvas must stay hidden like on the first load.
  expect(canvasShown(canvas)).toBe(false)
})

it('the first viewer stays hidden until its skin is on', async () => {
  const canvas = await loadFigure()
  // The first viewer, its skin not on it yet: hidden.
  expect(canvasShown(canvas)).toBe(false)
  await act(() => viewers[0].skinLoaded())
  expect(canvasShown(canvas)).toBe(true)
})
