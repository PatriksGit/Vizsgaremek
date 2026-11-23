import type { ReactNode } from 'react'
import { matchPath, Navigate, useLocation } from 'react-router'

import type { FromState } from './fromState'
import { endedByLogout, useAccount } from './queries'

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
 * would be another site's address, so it leads home instead. The forgotten
 * password panel is the exception: a logged-in player may reset too.
 */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { data: account, isFetched } = useAccount()
  const location = useLocation()
  const from: unknown = (location.state as { from?: unknown } | null)?.from

  if (!isFetched) return null
  if (account && !matchPath('/forgot-password', location.pathname)) {
    return <Navigate to={typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/'} replace />
  }
  return children
}
