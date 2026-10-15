import { createContext, useContext } from 'react'

import type { Account } from './api'

export type AuthState = {
  /** undefined while the session is being checked, null for a guest. */
  account: Account | null | undefined
  setAccount: (account: Account | null) => void
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const state = useContext(AuthContext)
  if (!state) throw new Error('useAuth must be used inside <AuthProvider>.')
  return state
}
