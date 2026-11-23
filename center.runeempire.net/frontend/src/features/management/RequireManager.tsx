import type { ReactNode } from 'react'
import { Navigate } from 'react-router'

import { useAccount } from '@/features/auth/queries'

/** The management pages are for accounts with the permission; anyone else goes home. */
export function RequireManager({ children }: { children: ReactNode }) {
  const account = useAccount().data
  return account?.can_manage ? children : <Navigate to="/" replace />
}
