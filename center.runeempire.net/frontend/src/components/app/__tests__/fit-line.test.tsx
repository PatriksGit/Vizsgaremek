/**
 * Regression test (review 2026-11-23, visual V1/V2). The hero name broke mid-word ("ClaudeTes / zt") and a stat value
 * ran under the icon tile ("9 950 10"): both now sit in FitLine, which keeps the line whole and zooms it down to its box.
 * jsdom has no layout, so the edges are faked: widths (getBoundingClientRect: the line's natural width times its zoom),
 * the ResizeObserver (its callback captured) and requestAnimationFrame (run at once).
 */
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { FitLine } from '@/components/app/FitLine'

let boxWidth = 100
let lineWidth = 200
let observed: (() => void) | null = null
const disconnect = vi.fn()
const originalRect = Element.prototype.getBoundingClientRect

beforeEach(() => {
  boxWidth = 100
  lineWidth = 200
  observed = null
  disconnect.mockClear()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        observed = callback
      }
      observe() {}
      unobserve() {}
      disconnect = disconnect
    },
  )
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
  Element.prototype.getBoundingClientRect = function (this: HTMLElement) {
    const zoom = Number.parseFloat(this.style.zoom) || 1
    const width = this.classList.contains('w-max') ? lineWidth * zoom : this.classList.contains('min-w-0') ? boxWidth : 0
    return { width, height: 0, top: 0, left: 0, right: width, bottom: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
  }
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  Element.prototype.getBoundingClientRect = originalRect
})

const lineOf = (container: HTMLElement) => container.querySelector<HTMLElement>('.w-max')!

it('repro: a line twice as wide as its box is zoomed to half before the first paint, never broken', () => {
  const { container } = render(<FitLine>ClaudeTeszt</FitLine>)

  expect(Number(lineOf(container).style.zoom)).toBeCloseTo(0.5)
  expect(lineOf(container).classList.contains('whitespace-nowrap')).toBe(true)
})

it('control: a line that fits keeps its size', () => {
  lineWidth = 80
  const { container } = render(<FitLine>Anna</FitLine>)

  expect(lineOf(container).style.zoom).toBe('')
})

it('the zoom follows the box: cleared when it grows back, measured at full size', () => {
  const { container } = render(<FitLine>ClaudeTeszt</FitLine>)
  expect(Number(lineOf(container).style.zoom)).toBeCloseTo(0.5)

  boxWidth = 300
  observed?.()
  expect(lineOf(container).style.zoom).toBe('')

  boxWidth = 50
  observed?.()
  expect(Number(lineOf(container).style.zoom)).toBeCloseTo(0.25)
})

it('a window that changes its width fits again; a height-only resize does nothing', () => {
  const { container } = render(<FitLine>ClaudeTeszt</FitLine>)

  boxWidth = 400
  window.dispatchEvent(new Event('resize'))
  expect(Number(lineOf(container).style.zoom)).toBeCloseTo(0.5) // same width: not asked

  vi.stubGlobal('innerWidth', window.innerWidth + 100)
  window.dispatchEvent(new Event('resize'))
  expect(lineOf(container).style.zoom).toBe('')
})

it('stops observing and listening once unmounted', () => {
  const removed = vi.spyOn(window, 'removeEventListener')
  const { container, unmount } = render(<FitLine>ClaudeTeszt</FitLine>)
  const line = lineOf(container)

  unmount()
  expect(disconnect).toHaveBeenCalled()
  expect(removed).toHaveBeenCalledWith('resize', expect.any(Function))

  boxWidth = 400
  vi.stubGlobal('innerWidth', window.innerWidth + 100)
  window.dispatchEvent(new Event('resize'))
  expect(Number(line.style.zoom)).toBeCloseTo(0.5)
  removed.mockRestore()
})
