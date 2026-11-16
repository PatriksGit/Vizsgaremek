import { ApiError, http } from '@/lib/api'

/** AccountResource on the backend. */
export type Account = {
  uuid: string
  username: string
  display_name: string
  /** When the account was created (ISO 8601); null only if the backend could not read it. */
  registered_at: string | null
}

type Wrapped<T> = { data: T }

export async function login(credentials: { username: string; password: string }): Promise<Account> {
  const response = await http.post<Wrapped<Account>>('/auth/login', credentials)
  return response.data.data
}

/** Ends the session. A session that already ended (401) counts as logged out. */
export async function logout(): Promise<void> {
  try {
    await http.post('/auth/logout')
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return
    throw error
  }
}

/**
 * The logged-in account, or null for a guest (the backend answers a guest with
 * data: null). A 401 still means logged out: a session invalidated by a
 * password change elsewhere is ended on this request.
 */
export async function fetchCurrentAccount(): Promise<Account | null> {
  try {
    const response = await http.get<Wrapped<Account | null>>('/auth/me')
    return response.data.data
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

export type RegistrationRequest = {
  displayName: string
  email: string
  password: string
  passwordConfirmation: string
  termsAccepted: boolean
  ageConfirmed: boolean
  /** The hidden bot trap ticked: sent only then, so a person's request never carries it. */
  newsletter?: boolean
}

export type PendingRegistration = {
  email: string
  /**
   * How long the emailed code works, counted when the response arrived; null
   * when the player opens the code step for a code mailed earlier (after a
   * reload), whose time is not known here.
   */
  expiresInMinutes: number | null
}

/** Parks the registration and emails the code that creates the account. */
export async function startRegistration(request: RegistrationRequest): Promise<PendingRegistration> {
  const response = await http.post<Wrapped<{ email: string; expires_at: string }>>('/auth/register', {
    display_name: request.displayName,
    email: request.email,
    password: request.password,
    password_confirmation: request.passwordConfirmation,
    terms: request.termsAccepted,
    age_confirmed: request.ageConfirmed,
    ...(request.newsletter ? { newsletter: true } : {}),
  })
  // Counted on the server's clock (its Date header): the visitor's clock can be hours off.
  const serverNow = Date.parse(String(response.headers.date))
  const millisecondsLeft = Date.parse(response.data.data.expires_at) - (Number.isNaN(serverNow) ? Date.now() : serverNow)
  return { email: response.data.data.email, expiresInMinutes: Math.max(1, Math.round(millisecondsLeft / 60_000)) }
}

/** A server time (ISO 8601) on the visitor's clock, measured against the response's Date header. */
function localTime(serverIso: string, dateHeader: unknown): number {
  const serverNow = Date.parse(String(dateHeader))
  return Date.now() + Date.parse(serverIso) - (Number.isNaN(serverNow) ? Date.now() : serverNow)
}

/** A password reset code that went out; the times are epoch ms on the visitor's clock. */
export type ResetCodeSent = {
  email: string
  /** Until when the code works. */
  expiresAt: number
  /** From when "Kód újraküldése" may be used. */
  resendAt: number
}

/** Forgotten password, step 1: mails a code to the account of this address. */
export async function requestPasswordReset({ email, newsletter }: { email: string; newsletter?: boolean }): Promise<ResetCodeSent> {
  const response = await http.post<Wrapped<{ email: string; expires_at: string; resend_at: string }>>('/auth/password/forgot', {
    email,
    // The hidden bot trap: sent only when ticked.
    ...(newsletter ? { newsletter: true } : {}),
  })
  const { data } = response.data
  return {
    email: data.email,
    expiresAt: localTime(data.expires_at, response.headers.date),
    resendAt: localTime(data.resend_at, response.headers.date),
  }
}

/**
 * When a code that went out earlier (the cooldown's 429) may be asked again,
 * on the visitor's clock: from Retry-After, a duration, so no clock skew.
 */
export function resendAtFromError(error: unknown): number | null {
  if (!(error instanceof ApiError) || error.code !== 'auth.code_recently_sent' || error.retryAfter === null) return null
  return Date.now() + error.retryAfter * 1000
}

/** Forgotten password, step 2: the right code lets this browser set a new password for a few minutes. */
export async function verifyResetCode(request: { email: string; code: string }): Promise<void> {
  await http.post('/auth/password/forgot/verify', request)
}

/** Forgotten password, last step: sets the new password; answers the account's name for the login form. */
export async function resetPassword(request: { password: string; passwordConfirmation: string }): Promise<{ username: string }> {
  const response = await http.post<Wrapped<{ username: string }>>('/auth/password/reset', {
    password: request.password,
    password_confirmation: request.passwordConfirmation,
  })
  return response.data.data
}

/** Redeems the emailed code: creates the account and logs the player in. */
export async function verifyRegistration(request: { email: string; code: string }): Promise<Account> {
  const response = await http.post<Wrapped<Account>>('/auth/register/verify', request)
  return response.data.data
}
