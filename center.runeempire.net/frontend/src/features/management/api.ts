import { isCancelledError, queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useSyncExternalStore, type MouseEvent } from 'react'
import { matchPath, useLocation, useNavigate } from 'react-router'

import { MANAGEMENT_NAV } from '@/features/app/nav'
import { useAccount } from '@/features/auth/queries'
import { http } from '@/lib/api'
import { toastError } from '@/lib/toastError'

/** GET /api/management/me: whether this browser holds the Google-confirmed management grant. */
type ManagementMe = { signed_in: false } | { signed_in: true; email: string; expires_at: string }

/**
 * Where the sign-in starts: a full-page navigation (a plain link or location.replace), never an XHR.
 * The backend sends a session with a live grant straight back to /management, anyone else to Google.
 */
export const GOOGLE_REDIRECT_URL = '/api/management/google/redirect'

async function fetchManagementMe(): Promise<ManagementMe> {
  const response = await http.get<{ data: ManagementMe }>('/management/me')
  return response.data.data
}

/**
 * One key and fetcher for the page's query and the menu's check, so the check's answer lands in the page's cache.
 * No retry and no focus/reconnect refetch HERE, on every observer (final review 2026-11-26) -- why: the observer that
 * rendered last sets the query's options, so the menu's cache reader without them made a re-check retry twice.
 */
function managementMeQuery(uuid: string | undefined) {
  return queryOptions({
    queryKey: ['management', 'me', uuid],
    queryFn: fetchManagementMe,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

/** How long an answer counts as fresh: the menu's check just before opening the page is not asked again. */
const FRESH_MS = 5_000

/**
 * The management grant of this browser session. No refetchInterval, no
 * refetch on focus and no retry: every call slides the backend's 30-minute
 * grant, so polling would keep it alive forever. A page arriving on a failed
 * answer still asks once (no retryOnMount: false), so Back after a failure is
 * not a blank page (review AM-1 path2).
 */
export function useManagementMe({ enabled = true }: { enabled?: boolean } = {}) {
  const account = useAccount().data
  return useQuery({
    ...managementMeQuery(account?.uuid),
    staleTime: FRESH_MS,
    enabled: enabled && Boolean(account?.can_manage),
  })
}

/**
 * Whether the last /management/me answer this tab has says signed in: for the menu's "Kilépés a
 * managementből" (owner, 2026-11-26). An observer that never fetches (enabled: false) -- why: every
 * /me call slides the 30-minute grant, so the menu must not ask. An invalidated answer counts as
 * "no" (final review 2026-11-26): the logout and a lapsed grant's hand-off invalidate it without a
 * refetch, and the next real answer clears that. A stale "yes" after the grant ran out by itself is
 * harmless: the logout only drops a grant.
 */
export function useManagementSignedIn() {
  const account = useAccount().data
  const client = useQueryClient()
  const { queryKey } = managementMeQuery(account?.uuid)
  const me = useQuery({ ...managementMeQuery(account?.uuid), enabled: false })
  const invalidated = useSyncExternalStore(
    (onChange) => client.getQueryCache().subscribe(onChange),
    () => client.getQueryState(queryKey)?.isInvalidated ?? false,
  )
  return Boolean(account?.can_manage) && me.data?.signed_in === true && !invalidated
}

/** Drops only the management grant; the website login stays. */
async function logoutManagement(): Promise<void> {
  await http.post('/management/logout')
}

/**
 * Kilépés: home afterwards, never a "signed out" cache entry -- why: a
 * signed-out /management forwards to Google at once, so the page must be left
 * first. replace: the back button cannot bring the ended dashboard back.
 * The logout route is behind the website login only, so it never answers
 * management.sign_in_required; a failure stays on the page with a toast, like the website's logout.
 */
export function useManagementLogout() {
  const navigate = useNavigate()
  const client = useQueryClient()

  return useMutation({
    mutationFn: logoutManagement,
    onSuccess: async () => {
      await navigate('/', { replace: true })
      // Stale, not refetched: the ended grant's answer must not open the dashboard again (Back within 5 s).
      void client.invalidateQueries({ queryKey: ['management', 'me'], refetchType: 'none' })
    },
    onError: toastError,
  })
}

/**
 * The Management menu item's click (owner, 2026-11-23): ask the backend first, staying on the current
 * page. A live grant opens /management inside the app (no reload, the answer is already there); without
 * one the browser goes straight to Google, so the management page never starts loading. A click with a
 * modifier key (new tab) keeps the link's own behaviour.
 */
/** Whether the page is the management frame (the hub or a tool), which forwards to Google by itself. */
function isUnderManagement(pathname: string) {
  return matchPath({ path: MANAGEMENT_NAV.to, end: false }, pathname) !== null
}

export function useOpenManagement() {
  const client = useQueryClient()
  const navigate = useNavigate()
  const account = useAccount().data
  // One check at a time: a second tap while the first is on its way does nothing.
  const checking = useRef(false)
  // The page the player is on: an answer that arrives after they moved on (or this menu unmounted) is dropped.
  const { key, pathname } = useLocation()
  const here = useRef<string | null>(key)
  useEffect(() => {
    here.current = key
    return () => {
      here.current = null
    }
  }, [key])

  return async (event: MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    if (checking.current) return
    checking.current = true
    const from = here.current
    try {
      const me = await client.fetchQuery({ ...managementMeQuery(account?.uuid), staleTime: 0, retry: false })
      if (here.current !== from) return
      if (me.signed_in) navigate(MANAGEMENT_NAV.to)
      // On a management page the frame got this answer too and forwards to Google itself (location.replace):
      // a second navigation would race over Socialite's state (final review 2026-11-26).
      else if (!isUnderManagement(pathname)) window.location.assign(GOOGLE_REDIRECT_URL)
    } catch (error) {
      // Cancelled by a login or logout meanwhile (setAccount cancels every query): nothing to say.
      if (isCancelledError(error)) return
      // A failure that arrives after the player moved on (a 15 s timeout) is dropped like a late answer.
      if (here.current !== from) return
      toastError(error)
    } finally {
      checking.current = false
    }
  }
}
