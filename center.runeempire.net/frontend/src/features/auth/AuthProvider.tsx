import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router'

import { fetchCurrentAccount, type Account } from './api'
import { AuthContext, useAuth } from './authContext'

/** Asks the backend once, on load, whether this browser has a session. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false

    fetchCurrentAccount()
      // Backend unreachable: show the login page, which explains the error on submit.
      .catch(() => null)
      .then((current) => {
        if (!cancelled) setAccount(current)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return <AuthContext value={{ account, setAccount }}>{children}</AuthContext>
}

/** Only for logged-in players; guests are sent to the login page. */
export function RequireAccount({ children }: { children: ReactNode }) {
  const { account } = useAuth()

  if (account === undefined) return null
  if (account === null) return <Navigate to="/login" replace />
  return children
}

/** Only for guests; a logged-in player is sent to the home page. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { account } = useAuth()

  if (account === undefined) return null
  if (account) return <Navigate to="/" replace />
  return children
}
