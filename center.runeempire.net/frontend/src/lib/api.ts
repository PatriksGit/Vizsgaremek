import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

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
  /** The backend's stable reason (e.g. 'auth.code_recently_sent'); null when no backend answered. */
  readonly code: string | null
  /** Extra data of that code, e.g. resend_at. */
  readonly details: Record<string, unknown>
  /** Seconds from the Retry-After header: a duration, so the visitor's clock does not matter. */
  readonly retryAfter: number | null

  constructor(
    status: number,
    message: string,
    fieldErrors: Record<string, string> = {},
    { code = null, details = {}, retryAfter = null }: { code?: string | null; details?: Record<string, unknown>; retryAfter?: number | null } = {},
  ) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
    this.code = code
    this.details = details
    this.retryAfter = retryAfter
  }
}

export const http = axios.create({
  baseURL: '/api',
  headers: { Accept: 'application/json' },
  // A hanging backend ends in an error the page can show, not in an endless wait.
  timeout: 15_000,
  // A timeout gets its own code (ETIMEDOUT), apart from an aborted request (ECONNABORTED).
  transitional: { clarifyTimeoutError: true },
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

type ErrorBody = { message?: unknown; code?: unknown; errors?: Record<string, unknown>; details?: unknown }

function toApiError(error: AxiosError): ApiError {
  const response = error.response
  // The request may well have arrived (a registration mails its code before it answers): the answer did not.
  if (!response && error.code === AxiosError.ETIMEDOUT) return new ApiError(0, 'A szerver nem válaszolt időben, próbáld újra később.')
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

  const code = typeof body.code === 'string' ? body.code : null
  const retryAfterHeader = Number(response.headers?.['retry-after'])
  const extra = {
    code,
    details: typeof body.details === 'object' && body.details !== null ? (body.details as Record<string, unknown>) : {},
    retryAfter: Number.isInteger(retryAfterHeader) && retryAfterHeader >= 0 ? retryAfterHeader : null,
  }

  if (response.status === 419) {
    return new ApiError(419, 'A munkamenet lejárt. Frissítsd az oldalt, és ellenőrizd, hogy a sütik engedélyezve vannak.', {}, extra)
  }

  // Every coded backend message is written for players, whatever the status;
  // server_error's may hold raw exception text while the backend runs in debug mode.
  if (code && code !== 'server_error') {
    return new ApiError(response.status, backendMessage ?? GENERIC_ERROR, fieldErrors, extra)
  }

  // A proxy (Vite in dev, Cloudflare in production) answering for a backend that is down.
  if (!backendMessage && [502, 503, 504, 530].includes(response.status)) {
    return new ApiError(response.status, 'A szerver most nem érhető el, próbáld újra később.', {}, extra)
  }

  // Without a code only these statuses carry a message meant for players.
  const message = backendMessage && !code && [403, 422, 429, 503].includes(response.status) ? backendMessage : GENERIC_ERROR

  return new ApiError(response.status, message, fieldErrors, extra)
}
