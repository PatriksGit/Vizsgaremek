import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'

import { fetchCurrentAccount, login, logout, startRegistration, verifyRegistration, type Account } from './api'

/** The logged-in account (null for a guest); every login, logout and 401 updates it. */
export const accountQueryKey = ['account'] as const

export function useAccount() {
  return useQuery({
    queryKey: accountQueryKey,
    queryFn: fetchCurrentAccount,
    // Rechecked when the player comes back to the tab, so an expired session shows.
    staleTime: 60_000,
    // An unreachable backend shows the error page at once instead of after retries.
    retry: false,
    // A failed check is not repeated whenever another component using it mounts:
    // with the backend down, every remount would send a new request.
    retryOnMount: false,
  })
}

/** Whether the session ended with the player's own logout (not a 401, not a guest's first visit). */
let loggedOutOnPurpose = false

/**
 * Whether the last session ended with the player's own logout. RequireAccount
 * then sends them to log in without the page they were on: the next login,
 * maybe another account, starts at home.
 */
export function endedByLogout() {
  return loggedOutOnPurpose
}

/**
 * Sets the account a login, registration or logout just decided. Any request
 * still on its way answers for the old session (a session check, or a 401 that
 * would log the new account out), so every one of them is dropped first.
 */
async function setAccount(queryClient: QueryClient, account: Account | null, byLogout = false) {
  await queryClient.cancelQueries()
  loggedOutOnPurpose = byLogout
  queryClient.setQueryData(accountQueryKey, account)
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: login,
    onSuccess: (account) => setAccount(queryClient, account),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: logout,
    onSuccess: () => setAccount(queryClient, null, true),
  })
}

export function useStartRegistration() {
  return useMutation({ mutationFn: startRegistration })
}

export function useVerifyRegistration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: verifyRegistration,
    onSuccess: (account) => setAccount(queryClient, account),
  })
}
