import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

/*
 * Axios client for the Laravel API. Session login: axios already echoes the
 * XSRF-TOKEN cookie back as the X-XSRF-TOKEN header on same-origin requests
 * (its default names match Laravel's), so this module only makes sure the
 * cookie exists and turns every failure into an ApiError.
 */

export const GENERIC_ERROR = 'Váratlan hiba történt, próbáld újra később.'

/** A failed API call, with the backend's per-field messages when it sent any (422). */
export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: Record<string, string>

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

export const http = axios.create({
  baseURL: '/api',
  headers: { Accept: 'application/json' },
})

function hasXsrfCookie(): boolean {
  return document.cookie.split('; ').some((entry) => entry.startsWith('XSRF-TOKEN='))
}

function fetchCsrfCookie() {
  return http.get('/sanctum/csrf-cookie')
}

// State-changing requests need the XSRF cookie; the first one of a visit fetches it.
http.interceptors.request.use(async (config) => {
  if (config.method !== 'get' && !hasXsrfCookie()) await fetchCsrfCookie()
  return config
})

type RetriableConfig = InternalAxiosRequestConfig & { csrfRetried?: boolean }

http.interceptors.response.use(undefined, async (error: unknown) => {
  if (!axios.isAxiosError(error)) throw error

  // An expired session takes its CSRF token with it: fetch a fresh one and try once more.
  const config = error.config as RetriableConfig | undefined
  if (error.response?.status === 419 && config && !config.csrfRetried) {
    config.csrfRetried = true
    await fetchCsrfCookie()
    return http(config)
  }

  throw toApiError(error)
})

type ErrorBody = { message?: unknown; errors?: Record<string, unknown> }

function toApiError(error: AxiosError): ApiError {
  const response = error.response
  if (!response) return new ApiError(0, 'Nem sikerült elérni a szervert. Ellenőrizd az internetkapcsolatod.')

  // The dev proxy answers with an empty or HTML body while the backend is down.
  const body: ErrorBody = typeof response.data === 'object' && response.data !== null ? response.data : {}
  const backendMessage = typeof body.message === 'string' ? body.message : undefined

  const fieldErrors: Record<string, string> = {}
  for (const [field, messages] of Object.entries(body.errors ?? {})) {
    if (Array.isArray(messages) && typeof messages[0] === 'string') {
      fieldErrors[field] = messages[0]
    }
  }

  if (response.status === 419) {
    return new ApiError(419, 'A munkamenet lejárt. Frissítsd az oldalt, és ellenőrizd, hogy a sütik engedélyezve vannak.')
  }

  // Only these statuses carry a message meant for players. Other 5xx bodies
  // can hold raw exception text while the backend runs in debug mode.
  const message = backendMessage && [403, 422, 429, 503].includes(response.status) ? backendMessage : GENERIC_ERROR

  return new ApiError(response.status, message, fieldErrors)
}
