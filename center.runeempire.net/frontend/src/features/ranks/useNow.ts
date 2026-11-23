import { useEffect, useState } from 'react'

/** The current time, refreshed every second (for countdowns and season ends). */
export function useNow() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return now
}
