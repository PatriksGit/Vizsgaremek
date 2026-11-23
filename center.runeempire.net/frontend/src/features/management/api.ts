import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router'

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
export function useManagementMe() {
  const account = useAccount().data
  return useQuery({
    queryKey: ['management', 'me', account?.uuid],
    queryFn: fetchManagementMe,
    enabled: Boolean(account?.can_manage),
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
