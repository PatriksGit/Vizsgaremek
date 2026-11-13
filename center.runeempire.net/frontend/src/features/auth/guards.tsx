import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'

import { endedByLogout, useAccount } from './queries'

/** The page a guest asked for when RequireAccount sent them to log in, in the router's location state. */
type FromState = { from?: string } | null

/**
 * Only for logged-in players; guests are sent to the login page, remembering
 * the page they asked for (a link opened while logged out, or a session that
 * ran out), so the login brings them back to it. After the player's own
 * logout nothing is remembered: the next login starts at home.
 */
export function RequireAccount({ children }: { children: ReactNode }) {
  const { data: account, isFetched } = useAccount()
  const { pathname, search } = useLocation()

  if (!isFetched) return null
  if (!account) {
    const state: FromState = endedByLogout() ? null : { from: pathname + search }
    return <Navigate to="/login" replace state={state} />
  }
  return children
}

/**
 * Only for guests; a logged-in player is sent to the page they asked for
 * before logging in (owner, 2026-11-13), or home. A path starting with "//"
 * would be another site's address, so it leads home instead.
 */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { data: account, isFetched } = useAccount()
  const from = (useLocation().state as FromState)?.from

  if (!isFetched) return null
  if (account) return <Navigate to={from?.startsWith('/') && !from.startsWith('//') ? from : '/'} replace />
  return children
}
