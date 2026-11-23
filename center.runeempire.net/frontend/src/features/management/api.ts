import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { MouseEvent } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { formMessage } from '@/features/auth/errors'
import { useAccount } from '@/features/auth/queries'
import { http } from '@/lib/api'

/** GET /api/management/me: whether this browser holds the Google-confirmed management grant. */
export type ManagementMe = { signed_in: false } | { signed_in: true; email: string; expires_at: string }

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
 * The management grant of this browser session. No refetchInterval and no
 * refetch on focus: every call slides the backend's 30-minute grant, so
 * polling would keep it alive forever.
 */
/** How long an answer counts as fresh: the menu's check just before opening the page is not asked again. */
const FRESH_MS = 5_000

export function useManagementMe({ enabled = true }: { enabled?: boolean } = {}) {
  const account = useAccount().data
  return useQuery({
    queryKey: ['management', 'me', account?.uuid],
    queryFn: fetchManagementMe,
    staleTime: FRESH_MS,
    enabled: enabled && Boolean(account?.can_manage),
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

/** Drops only the management grant; the website login stays. */
export async function logoutManagement(): Promise<void> {
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

  return async (event: MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    try {
      const me = await client.fetchQuery({ queryKey: ['management', 'me', account?.uuid], queryFn: fetchManagementMe, staleTime: 0 })
      if (me.signed_in) navigate('/management')
      else window.location.assign(GOOGLE_REDIRECT_URL)
    } catch (error) {
      toast.error(formMessage(error))
    }
  }
}
