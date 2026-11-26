import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'

import { forgetManagementPresence } from '@/features/management/api'
import { ApiError, http } from '@/lib/api'

/** What the staff search looks in (owner, 2026-11-26): the name, the last IP or the e-mail. */
export type SearchMode = 'name' | 'ip' | 'email'

/** One search result: the name and the two fields staff search by (null: none). */
export type PlayerSummary = { name: string; email: string | null; last_ip: string | null }

/** One staff log entry; old_value / new_value are the e-mails of a change, null for 2FA. */
export type ManagementAction = {
  id: number
  action: 'email_changed' | 'two_factor_disabled'
  manager: { name: string; email: string }
  target: { name: string }
  old_value: string | null
  new_value: string | null
  created_at: string
}

/** GET /api/management/players/{name}: an account's private details for the dialog. */
export type ManagementPlayer = {
  name: string
  uuid: string
  email: string | null
  registered_at: string | null
  registered_ip: string | null
  last_login_at: string | null
  last_ip: string | null
  two_factor_enabled: boolean
  locked: boolean
  lock: { reason: string | null; locked_by: string; locked_at: string } | null
  /** A manager's account (the own one too): both actions are refused on it. */
  protected: boolean
  recent_actions: ManagementAction[]
}

/** What q may hold in each mode: the backend's SearchManagementPlayersRequest patterns. */
const PATTERNS: Record<SearchMode, RegExp> = {
  name: /^[A-Za-z0-9_]{2,16}$/,
  ip: /^[0-9A-Fa-f.:]{2,45}$/,
  email: /^[\x21-\x7E]{2,255}$/,
}

/** The query as the backend compares it: an e-mail start trimmed and lowercased. */
export function normalizedQuery(mode: SearchMode, q: string) {
  return mode === 'email' ? q.trim().toLowerCase() : q
}

/** Whether the box holds something the backend can be asked about in this mode. */
export function searchableFor(mode: SearchMode, q: string) {
  return PATTERNS[mode].test(normalizedQuery(mode, q))
}

/**
 * The 30-minute management grant can run out while the page is open: a
 * management.sign_in_required answer marks the management check stale, so
 * ManagementPage asks again and forwards to Google. TanStack Query v5 has no
 * onError on useQuery, so every fetcher here goes through handingOff.
 */
export function handOffOnSignInRequired(client: QueryClient, error: unknown) {
  if (error instanceof ApiError && error.code === 'management.sign_in_required') {
    void client.invalidateQueries({ queryKey: ['management', 'me'] })
    forgetManagementPresence(client)
  }
}

async function handingOff<T>(client: QueryClient, request: () => Promise<T>): Promise<T> {
  try {
    return await request()
  } catch (error) {
    handOffOnSignInRequired(client, error)
    throw error
  }
}

const searchKey = ['management', 'players', 'search'] as const
const actionsKey = ['management', 'actions'] as const
const playerKey = (name: string) => ['management', 'player', name.toLowerCase()] as const

/** GET /api/management/players?by=&q=: at most 30 accounts, and how many more match. */
export function useManagementPlayerSearch(mode: SearchMode, q: string) {
  const client = useQueryClient()
  const query = normalizedQuery(mode, q)
  return useQuery({
    queryKey: [...searchKey, mode, query.toLowerCase()],
    queryFn: () =>
      handingOff(client, async () => {
        const response = await http.get<{ data: PlayerSummary[]; meta: { more: number } }>('/management/players', {
          params: { by: mode, q: query },
        })
        return { mode, query, players: response.data.data, more: response.data.meta.more }
      }),
    enabled: searchableFor(mode, q),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    // A refusal (429, a lapsed grant) shows at once; the next keystroke asks again.
    retry: false,
  })
}

/** The dialog's account; null asks nothing (no dialog open). */
export function useManagementPlayer(name: string | null) {
  const client = useQueryClient()
  return useQuery({
    queryKey: playerKey(name ?? ''),
    queryFn: () =>
      handingOff(client, async () => {
        const response = await http.get<{ data: ManagementPlayer }>(`/management/players/${name}`)
        return response.data.data
      }),
    enabled: name !== null,
    retry: false,
  })
}

/**
 * After a staff action: the dialog shows the answer at once, and the open
 * search (its e-mail column) and the Napló are asked again.
 */
function useAfterAction(name: string) {
  const client = useQueryClient()
  return (player: ManagementPlayer) => {
    client.setQueryData(playerKey(name), player)
    void client.invalidateQueries({ queryKey: searchKey })
    void client.invalidateQueries({ queryKey: actionsKey })
  }
}

/** PUT /api/management/players/{name}/email. */
export function useChangePlayerEmail(name: string) {
  const client = useQueryClient()
  const onSuccess = useAfterAction(name)
  return useMutation({
    mutationFn: (email: string) =>
      handingOff(client, async () => {
        const response = await http.put<{ data: ManagementPlayer }>(`/management/players/${name}/email`, { email })
        return response.data.data
      }),
    onSuccess,
  })
}

/** DELETE /api/management/players/{name}/two-factor. */
export function useDisablePlayerTwoFactor(name: string) {
  const client = useQueryClient()
  const onSuccess = useAfterAction(name)
  return useMutation({
    mutationFn: () =>
      handingOff(client, async () => {
        const response = await http.delete<{ data: ManagementPlayer }>(`/management/players/${name}/two-factor`)
        return response.data.data
      }),
    onSuccess,
  })
}

type ActionsPage = { data: ManagementAction[]; meta: { next_cursor: string | null } }

/** GET /api/management/actions: the staff log, newest first, 25 a page by cursor ("Több betöltése"). */
export function useManagementActions() {
  const client = useQueryClient()
  return useInfiniteQuery({
    queryKey: actionsKey,
    queryFn: ({ pageParam }) =>
      handingOff(client, async () => {
        const response = await http.get<ActionsPage>('/management/actions', { params: pageParam ? { cursor: pageParam } : {} })
        return response.data
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.meta.next_cursor ?? undefined,
    retry: false,
  })
}
