import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { fetchCurrentAccount, login, logout, startRegistration, verifyRegistration } from './api'

/** The logged-in account (null for a guest); every login, logout and 401 updates it. */
export const accountQueryKey = ['account'] as const

export function useAccount() {
  return useQuery({
    queryKey: accountQueryKey,
    queryFn: fetchCurrentAccount,
    // Rechecked when the player comes back to the tab, so an expired session shows.
    staleTime: 60_000,
    // An unreachable backend shows the login page at once, which explains the error on submit.
    retry: false,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: login,
    onSuccess: (account) => queryClient.setQueryData(accountQueryKey, account),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: logout,
    onSuccess: () => queryClient.setQueryData(accountQueryKey, null),
  })
}

export function useStartRegistration() {
  return useMutation({ mutationFn: startRegistration })
}

export function useVerifyRegistration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: verifyRegistration,
    onSuccess: (account) => queryClient.setQueryData(accountQueryKey, account),
  })
}
