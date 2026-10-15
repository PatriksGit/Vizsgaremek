import { useEffect, useState } from 'react'

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Counts from 0 up to target once, easing out, so a number "spins up" when
 * the page loads. With reduced motion it starts at the target instead.
 */
export function useCountUp(target: number, durationMs = 1200) {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0))

  useEffect(() => {
    if (prefersReducedMotion()) return

    let frame = 0
    // Taken from the first frame: a frame's timestamp can be slightly earlier
    // than performance.now() here, which would make the progress negative.
    let start: number | undefined

    const tick = (now: number) => {
      start ??= now
      const progress = Math.min((now - start) / durationMs, 1)
      setValue(Math.round(target * (1 - (1 - progress) ** 3)))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs])

  return value
}
