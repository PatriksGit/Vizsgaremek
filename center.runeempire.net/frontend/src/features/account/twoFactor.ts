import { useQueryClient } from '@tanstack/react-query'

import type { Account } from '@/features/auth/api'
import { accountQueryKey } from '@/features/auth/queries'

/**
 * Writes the new 2FA state into the cached account, so the card switches at
 * once without asking /api/auth/me again.
 */
export function useSetTwoFactorEnabled() {
  const queryClient = useQueryClient()

  return (enabled: boolean) =>
    queryClient.setQueryData<Account | null>(accountQueryKey, (account) => (account ? { ...account, two_factor_enabled: enabled } : account))
}

/** The key in groups of four, easier to type into an app by hand (the app ignores the spaces). */
export function groupedKey(secret: string) {
  return secret.match(/.{1,4}/g)?.join(' ') ?? secret
}
