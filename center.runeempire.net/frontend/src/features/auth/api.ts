import { ApiError, apiRequest } from '@/lib/api'

/** AccountResource on the backend. */
export type Account = {
  uuid: string
  username: string
  display_name: string
}

type Wrapped<T> = { data: T }

export async function login(username: string, password: string): Promise<Account> {
  const response = await apiRequest<Wrapped<Account>>('POST', '/auth/login', { username, password })
  return response.data
}

export async function logout(): Promise<void> {
  await apiRequest<void>('POST', '/auth/logout')
}

/** The logged-in account, or null for a guest. */
export async function fetchCurrentAccount(): Promise<Account | null> {
  try {
    const response = await apiRequest<Wrapped<Account>>('GET', '/auth/me')
    return response.data
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

export type PendingRegistration = {
  email: string
  /** How long the emailed code works, counted when the response arrived. */
  expiresInMinutes: number
}

/** Parks the registration and emails the code that creates the account. */
export async function startRegistration(details: {
  displayName: string
  email: string
  password: string
  passwordConfirmation: string
  termsAccepted: boolean
}): Promise<PendingRegistration> {
  const response = await apiRequest<Wrapped<{ email: string; expires_at: string }>>('POST', '/auth/register', {
    display_name: details.displayName,
    email: details.email,
    password: details.password,
    password_confirmation: details.passwordConfirmation,
    terms: details.termsAccepted,
  })
  const millisecondsLeft = Date.parse(response.data.expires_at) - Date.now()
  return { email: response.data.email, expiresInMinutes: Math.max(1, Math.round(millisecondsLeft / 60_000)) }
}

/** Redeems the emailed code: creates the account and logs the player in. */
export async function verifyRegistration(email: string, code: string): Promise<Account> {
  const response = await apiRequest<Wrapped<Account>>('POST', '/auth/register/verify', { email, code })
  return response.data
}
