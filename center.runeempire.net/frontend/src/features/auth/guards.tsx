import type { ReactNode } from 'react'
import { Navigate } from 'react-router'

import { useAccount } from './queries'

/** Only for logged-in players; guests are sent to the login page. */
export function RequireAccount({ children }: { children: ReactNode }) {
  const { data: account, isPending } = useAccount()

  if (isPending) return null
  if (!account) return <Navigate to="/login" replace />
  return children
}

/** Only for guests; a logged-in player is sent to the home page. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { data: account, isPending } = useAccount()

  if (isPending) return null
  if (account) return <Navigate to="/" replace />
  return children
}
