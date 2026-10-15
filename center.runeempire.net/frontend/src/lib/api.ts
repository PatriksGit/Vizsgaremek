/*
 * JSON client for the Laravel API. Session login: the session and XSRF-TOKEN
 * cookies live on this origin, and every state-changing request echoes the
 * XSRF token back in a header.
 */

const GENERIC_ERROR = 'Váratlan hiba történt, próbáld újra később.'

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

type ErrorBody = { message?: unknown; errors?: Record<string, unknown> }

function xsrfToken(): string | undefined {
  const cookie = document.cookie.split('; ').find((entry) => entry.startsWith('XSRF-TOKEN='))
  return cookie && decodeURIComponent(cookie.slice('XSRF-TOKEN='.length))
}

async function fetchCsrfCookie() {
  await fetch('/api/sanctum/csrf-cookie', { headers: { Accept: 'application/json' } })
}

async function readJson(response: Response): Promise<unknown> {
  // The dev proxy answers with an empty or HTML body while the backend is down.
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  const body = ((await readJson(response)) ?? {}) as ErrorBody
  const backendMessage = typeof body.message === 'string' ? body.message : undefined

  const fieldErrors: Record<string, string> = {}
  for (const [field, messages] of Object.entries(body.errors ?? {})) {
    if (Array.isArray(messages) && typeof messages[0] === 'string') {
      fieldErrors[field] = messages[0]
    }
  }

  // Only these statuses carry a message meant for players. Other 5xx bodies
  // can hold raw exception text while the backend runs in debug mode.
  const message =
    backendMessage && [403, 422, 429, 503].includes(response.status) ? backendMessage : GENERIC_ERROR

  return new ApiError(response.status, message, fieldErrors)
}

/**
 * Calls the API and returns the parsed JSON body (undefined for 204).
 * State-changing requests fetch the CSRF cookie first when it is missing,
 * and retry once after a 419 (the session, and with it the token, expired).
 */
export async function apiRequest<T>(method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown): Promise<T> {
  const send = async () => {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (body !== undefined) headers['Content-Type'] = 'application/json'

    if (method !== 'GET') {
      if (!xsrfToken()) await fetchCsrfCookie()
      // Read on every request: login and logout issue a new token.
      const token = xsrfToken()
      if (token) headers['X-XSRF-TOKEN'] = token
    }

    return fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  }

  let response: Response
  try {
    response = await send()
    if (response.status === 419) {
      await fetchCsrfCookie()
      response = await send()
    }
  } catch {
    throw new ApiError(0, 'Nem sikerült elérni a szervert. Ellenőrizd az internetkapcsolatod.')
  }

  if (!response.ok) throw await toApiError(response)
  return (await readJson(response)) as T
}
