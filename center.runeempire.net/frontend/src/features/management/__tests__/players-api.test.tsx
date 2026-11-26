/**
 * The staff tools' API layer (2026-11-26): what each search mode may send,
 * and the hand-off when the 30-minute management grant ran out meanwhile.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { searchableFor, useChangePlayerEmail, useManagementPlayer } from '@/features/management/playersApi'
import { http } from '@/lib/api'
import { installFakeBackend } from '@/test/fakeBackend'

const originalAdapter = http.defaults.adapter
afterEach(() => {
  http.defaults.adapter = originalAdapter
})

const SIGN_IN_REQUIRED = {
  status: 403,
  data: { message: 'Jelentkezz be újra a managementbe.', code: 'management.sign_in_required' },
}

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { invalidate, wrapper }
}

describe('searchableFor', () => {
  it('takes a name start of 2-16 name characters', () => {
    expect(searchableFor('name', 'St')).toBe(true)
    expect(searchableFor('name', 'S')).toBe(false)
    expect(searchableFor('name', 'St-1')).toBe(false)
  })

  it('takes an IP start of digits, dots and colons', () => {
    expect(searchableFor('ip', '85.66.')).toBe(true)
    expect(searchableFor('ip', '85.66.x')).toBe(false)
  })

  it('takes an ASCII e-mail start, trimmed', () => {
    expect(searchableFor('email', ' Steve@Ex ')).toBe(true)
    expect(searchableFor('email', 'pátrik')).toBe(false)
    expect(searchableFor('email', ' s ')).toBe(false)
  })
})

describe('the hand-off to the Google sign-in', () => {
  it('a write refused with management.sign_in_required marks the management check stale', async () => {
    installFakeBackend({ 'PUT /management/players/Steve/email': () => SIGN_IN_REQUIRED })
    const { invalidate, wrapper } = setup()
    const { result } = renderHook(() => useChangePlayerEmail('Steve'), { wrapper })

    await act(async () => {
      await result.current.mutateAsync('new@example.com').catch(() => {})
    })

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['management', 'me'] })
  })

  it('a read refused the same way does it too, any other error does not', async () => {
    installFakeBackend({
      'GET /management/players/Steve': () => SIGN_IN_REQUIRED,
      'GET /management/players/Alex': () => ({ status: 404, data: { message: 'Nincs ilyen játékos.', code: 'players.not_found' } }),
    })
    const { invalidate, wrapper } = setup()

    const steve = renderHook(() => useManagementPlayer('Steve'), { wrapper })
    await waitFor(() => expect(steve.result.current.isError).toBe(true))
    expect(invalidate).toHaveBeenCalledTimes(1)

    const alex = renderHook(() => useManagementPlayer('Alex'), { wrapper })
    await waitFor(() => expect(alex.result.current.isError).toBe(true))
    expect(invalidate).toHaveBeenCalledTimes(1)
  })
})
