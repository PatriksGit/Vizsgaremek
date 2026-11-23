import { isCancelledError, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, type MouseEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { formMessage } from '@/features/auth/errors'
import { useAccount } from '@/features/auth/queries'
import { http } from '@/lib/api'

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
    queryKey: ['management', 'me', account?.uuid],
    queryFn: fetchManagementMe,
    staleTime: FRESH_MS,
    enabled: enabled && Boolean(account?.can_manage),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
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
 * management.sign_in_required; a failure stays on the page (the caller toasts).
 */
export function useManagementLogout() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: logoutManagement,
    onSuccess: () => navigate('/', { replace: true }),
  })
}

/**
 * The Management menu item's click (owner, 2026-11-23): ask the backend first, staying on the current
 * page. A live grant opens /management inside the app (no reload, the answer is already there); without
 * one the browser goes straight to Google, so the management page never starts loading. A click with a
 * modifier key (new tab) keeps the link's own behaviour.
 */
export function useOpenManagement() {
  const client = useQueryClient()
  const navigate = useNavigate()
  const account = useAccount().data
  // One check at a time: a second tap while the first is on its way does nothing.
  const checking = useRef(false)
  // The page the player is on: an answer that arrives after they moved on (or this menu unmounted) is dropped.
  const { key } = useLocation()
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
      const me = await client.fetchQuery({
        queryKey: ['management', 'me', account?.uuid],
        queryFn: fetchManagementMe,
        staleTime: 0,
        retry: false,
      })
      if (here.current !== from) return
      if (me.signed_in) navigate('/management')
      else window.location.assign(GOOGLE_REDIRECT_URL)
    } catch (error) {
      // Cancelled by a login or logout meanwhile (setAccount cancels every query): nothing to say.
      if (isCancelledError(error)) return
      toast.error(formMessage(error))
    } finally {
      checking.current = false
    }
  }
}
