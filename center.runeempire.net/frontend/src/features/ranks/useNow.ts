import { useEffect, useState } from 'react'

/** The current time, refreshed every step (for countdowns and season ends). */
export function useNow(stepMs = 1000) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), stepMs)
    return () => clearInterval(timer)
  }, [stepMs])

  return now
}
