import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'

import { accountQueryKey } from '@/features/auth/queries'
import { ApiError } from '@/lib/api'

/** Any request answered with 401 means the session is gone: forget the account, and the guards send the player to login. */
function forgetAccountOnUnauthorized(error: unknown) {
  if (error instanceof ApiError && error.status === 401) {
    queryClient.setQueryData(accountQueryKey, null)
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: forgetAccountOnUnauthorized }),
  mutationCache: new MutationCache({ onError: forgetAccountOnUnauthorized }),
  defaultOptions: {
    queries: {
      // A 4xx answer will not change on its own; retry only network errors and 5xx.
      retry: (failureCount, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
    },
  },
})
