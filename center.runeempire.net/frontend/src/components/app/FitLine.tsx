import { type ReactNode, useLayoutEffect, useRef } from 'react'

import { fitScale } from '@/lib/fitScale'
import { cn } from '@/lib/utils'

type FitLineProps = {
  children: ReactNode
  /** The box: it takes the width it is given. */
  className?: string
  /** The one line inside it. */
  lineClassName?: string
}

/**
 * Keeps its content on ONE line and, when the box is narrower than the line, shrinks the whole line to fit (CSS zoom, so
 * its height shrinks too) instead of wrapping or spilling: the rank shop's in-game look, the overview's name and its stat
 * values (owner, 2026-11-17: "a broken line is not pretty"; review 2026-11-23 V1/V2: "ClaudeTes / zt", "9 950 10").
 */
export function FitLine({ children, className, lineClassName }: FitLineProps) {
  const box = useRef<HTMLSpanElement>(null)
  const line = useRef<HTMLSpanElement>(null)

  // Measured again whenever the box resizes or the line changes (an image loading, another name or number).
  useLayoutEffect(() => {
    const boxElement = box.current
    const lineElement = line.current
    if (!boxElement || !lineElement) return

    const fit = () => {
      // Measured at full size: a box sized by its content (a flex item) would otherwise keep a shrunk line small for good.
      // Fractional widths: clientWidth rounds down, which shrank lines that fit by a hair.
      lineElement.style.zoom = ''
      const available = boxElement.getBoundingClientRect().width
      let scale = fitScale(lineElement.getBoundingClientRect().width, available)
      if (scale < 1) {
        lineElement.style.zoom = String(scale)
        // The browser rounds a zoomed font size, so the line can still be a pixel or two too wide: one correction.
        scale *= fitScale(lineElement.getBoundingClientRect().width, available)
      }
      lineElement.style.zoom = scale < 1 ? String(scale) : ''
    }

    // Once before the first paint, so a new line is never shown unshrunk for a frame.
    fit()

    // Later changes in the next frame, not inside the observer's callback: resizing the observed line there is a
    // "ResizeObserver loop" error in Chrome (seen with Playwright).
    let frame = 0
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(fit)
    }

    const observer = new ResizeObserver(schedule)
    observer.observe(boxElement)
    observer.observe(lineElement)
    // A box that hugs its shrunk line never resizes when the window grows (the hero at xl, a stat card): ask on a resize
    // of the window's width too (a height-only resize, such as a phone's address bar, changes nothing here).
    let width = window.innerWidth
    const onResize = () => {
      if (window.innerWidth === width) return
      width = window.innerWidth
      schedule()
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <span ref={box} className={cn('flex w-full min-w-0', className)}>
      {/* flex-none and w-max: as a flex item it would squeeze to the box and spill, and measure as if it fit. */}
      <span ref={line} className={cn('w-max flex-none whitespace-nowrap', lineClassName)}>
        {children}
      </span>
    </span>
  )
}
