import { ApiError, http } from '@/lib/api'

/** AccountResource on the backend. */
export type Account = {
  uuid: string
  username: string
  display_name: string
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

/** The logged-in account, or null for a guest. */
export async function fetchCurrentAccount(): Promise<Account | null> {
  try {
    const response = await http.get<Wrapped<Account>>('/auth/me')
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
}

export type PendingRegistration = {
  email: string
  /** How long the emailed code works, counted when the response arrived. */
  expiresInMinutes: number
}

/** Parks the registration and emails the code that creates the account. */
export async function startRegistration(request: RegistrationRequest): Promise<PendingRegistration> {
  const response = await http.post<Wrapped<{ email: string; expires_at: string }>>('/auth/register', {
    display_name: request.displayName,
    email: request.email,
    password: request.password,
    password_confirmation: request.passwordConfirmation,
    terms: request.termsAccepted,
  })
  const millisecondsLeft = Date.parse(response.data.data.expires_at) - Date.now()
  return { email: response.data.data.email, expiresInMinutes: Math.max(1, Math.round(millisecondsLeft / 60_000)) }
}

/** Redeems the emailed code: creates the account and logs the player in. */
export async function verifyRegistration(request: { email: string; code: string }): Promise<Account> {
  const response = await http.post<Wrapped<Account>>('/auth/register/verify', request)
  return response.data.data
}
