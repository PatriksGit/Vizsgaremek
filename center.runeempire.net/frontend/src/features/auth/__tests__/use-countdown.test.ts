import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCountdown } from '@/features/auth/useCountdown'

describe('useCountdown', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('counts whole seconds down to the moment and stops at 0', () => {
    const until = Date.now() + 3_000
    const { result } = renderHook(() => useCountdown(until))
    expect(result.current).toBe(3)

    act(() => vi.advanceTimersByTime(1_000))
    expect(result.current).toBe(2)

    act(() => vi.advanceTimersByTime(5_000))
    expect(result.current).toBe(0)
  })

  it('a moment already past, or none, is 0', () => {
    expect(renderHook(() => useCountdown(Date.now() - 1_000)).result.current).toBe(0)
    expect(renderHook(() => useCountdown(null)).result.current).toBe(0)
  })

  it('starts over when the moment moves (a new code was sent)', () => {
    const { result, rerender } = renderHook(({ until }) => useCountdown(until), { initialProps: { until: Date.now() + 1_000 } })
    act(() => vi.advanceTimersByTime(2_000))
    expect(result.current).toBe(0)

    rerender({ until: Date.now() + 10_000 })
    expect(result.current).toBe(10)
  })
})
