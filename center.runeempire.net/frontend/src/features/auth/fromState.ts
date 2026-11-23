import { useLocation } from 'react-router'

/** The page a guest asked for when RequireAccount sent them to log in, in the router's location state. */
export type FromState = { from?: string } | null

/**
 * Only the asked-for page out of this location's state, to pass on between the login, the
 * registration and the forgotten password panel (review 2026-11-23 auth K2), so the account made
 * or the password reset there still leads back to it. Nothing else of the state goes along, and only
 * a string: the router state is the browser's history entry, so anything else is not passed on.
 */
export function useFromState(): FromState {
  const from: unknown = (useLocation().state as { from?: unknown } | null)?.from
  return typeof from === 'string' ? { from } : null
}
