import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'

import { toastError } from '@/lib/toastError'

import {
  fetchCurrentAccount,
  login,
  loginWithTwoFactor,
  logout,
  requestPasswordReset,
  resetPassword,
  startRegistration,
  verifyRegistration,
  verifyResetCode,
  type Account,
} from './api'

/** The logged-in account (null for a guest); every login, logout and 401 updates it. */
export const accountQueryKey = ['account'] as const

export function useAccount() {
  return useQuery({
    queryKey: accountQueryKey,
    queryFn: async (context) => {
      const account = await fetchCurrentAccount()
      // Logged in again, maybe in another tab: the logout is no longer the last word. Not an answer
      // that setAccount cancelled (a logout meanwhile): it speaks for the session that just ended.
      // The signal is read only after the answer, so an unmount never cancels the check itself.
      if (account && !context.signal.aborted) loggedOutOnPurpose = false
      return account
    },
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

/** The password step. A 2FA account is not logged in yet: the caller asks for the code (useLoginWithTwoFactor). */
export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: login,
    onSuccess: async (result) => {
      if (result.account) await setAccount(queryClient, result.account)
    },
  })
}

/** The login's second step for a 2FA account. */
export function useLoginWithTwoFactor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: loginWithTwoFactor,
    onSuccess: (account) => setAccount(queryClient, account),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: logout,
    onSuccess: () => setAccount(queryClient, null, true),
    // Every logout button (the sidebar's menu, Beállítások on phones) shows a failure the same way.
    onError: toastError,
  })
}

export function useStartRegistration() {
  return useMutation({ mutationFn: startRegistration })
}

export function useRequestPasswordReset() {
  return useMutation({ mutationFn: requestPasswordReset })
}

export function useVerifyResetCode() {
  return useMutation({ mutationFn: verifyResetCode })
}

/**
 * Sets the new password, then asks the backend who is logged in now: a reset
 * of the logged-in account ended this session too, a reset of another one did
 * not. Resolves with the name and that account (null = logged out). The
 * password has changed by then, so a failing check does not fail the reset:
 * the visitor counts as logged out and the account is checked again later.
 */
export function useResetPassword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: { password: string; passwordConfirmation: string; twoFactorCode?: string }) => {
      const { username } = await resetPassword(request)
      let account: Account | null
      try {
        account = await fetchCurrentAccount()
      } catch {
        // Not the cached account (it may be the one just reset): logged out until the next check says otherwise.
        await setAccount(queryClient, null)
        // Not awaited: a backend gone quiet must not hold the finished reset.
        void queryClient.invalidateQueries({ queryKey: accountQueryKey })
        return { username, account: null }
      }
      await setAccount(queryClient, account)
      return { username, account }
    },
  })
}

export function useVerifyRegistration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: verifyRegistration,
    onSuccess: (account) => setAccount(queryClient, account),
  })
}
