import { describe, expect, it } from 'vitest'

import { ApiError, GENERIC_ERROR, http } from '@/lib/api'
import { installFakeBackend, type Reply } from '@/test/fakeBackend'

/** What toApiError makes of a backend error body: the code decides, the message is shown. */
async function failureOf(reply: Reply): Promise<ApiError> {
  installFakeBackend({ 'GET /probe': () => reply })
  try {
    await http.get('/probe')
  } catch (error) {
    if (error instanceof ApiError) return error
    throw error
  }
  throw new Error('the request did not fail')
}

describe('ApiError carries the backend error code', () => {
  it('a coded 404 shows its own message', async () => {
    const error = await failureOf({ status: 404, data: { message: 'Nincs ilyen játékos.', code: 'players.not_found' } })

    expect(error.code).toBe('players.not_found')
    expect(error.message).toBe('Nincs ilyen játékos.')
  })

  it('server_error never shows its message (debug text may be in it)', async () => {
    const error = await failureOf({ status: 500, data: { message: 'SQLSTATE[HY000] belső részlet', code: 'server_error' } })

    expect(error.code).toBe('server_error')
    expect(error.message).toBe(GENERIC_ERROR)
  })

  it('an unknown code still shows its message', async () => {
    const error = await failureOf({ status: 409, data: { message: 'Ütközés.', code: 'shop.something_new' } })

    expect(error.code).toBe('shop.something_new')
    expect(error.message).toBe('Ütközés.')
  })

  it('a body without a code behaves as before', async () => {
    const error = await failureOf({ status: 500, data: { message: 'belső részlet' } })

    expect(error.code).toBeNull()
    expect(error.message).toBe(GENERIC_ERROR)
  })

  it('keeps the details and the Retry-After seconds', async () => {
    const error = await failureOf({
      status: 429,
      data: { message: 'Nemrég küldtünk kódot.', code: 'auth.code_recently_sent', details: { resend_at: '2026-11-16T10:40:00Z' } },
      headers: { 'retry-after': '600' },
    })

    expect(error.details).toEqual({ resend_at: '2026-11-16T10:40:00Z' })
    expect(error.retryAfter).toBe(600)
  })

  it('no Retry-After header means no wait is known', async () => {
    const error = await failureOf({ status: 429, data: { message: 'Túl sok próbálkozás.', code: 'too_many_requests' } })

    expect(error.retryAfter).toBeNull()
    expect(error.details).toEqual({})
  })
})
