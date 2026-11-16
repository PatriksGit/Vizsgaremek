import { useEffect, useState } from 'react'

const secondsUntil = (until: number | null) => (until === null ? 0 : Math.max(0, Math.ceil((until - Date.now()) / 1000)))

/** Whole seconds left until a moment (epoch ms on the visitor's clock), ticking each second; 0 once it passed. */
export function useCountdown(until: number | null): number {
  const [left, setLeft] = useState(() => secondsUntil(until))
  const [counting, setCounting] = useState(until)

  // A new moment (a new code was sent) starts over at once, not on the next tick.
  if (until !== counting) {
    setCounting(until)
    setLeft(secondsUntil(until))
  }

  useEffect(() => {
    if (until === null) return
    const timer = setInterval(() => {
      const seconds = secondsUntil(until)
      setLeft(seconds)
      if (seconds === 0) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [until])

  return left
}
