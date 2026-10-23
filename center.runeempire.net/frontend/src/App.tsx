import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router'

import { ErrorPage } from '@/components/ErrorPage'
import { SiteFooter } from '@/components/SiteFooter'
import { Toaster } from '@/components/ui/sonner'
import { AccountPage } from '@/features/account/AccountPage'
import { AppLayout } from '@/features/app/AppLayout'
import { AuthPage } from '@/features/auth/AuthPage'
import { GuestOnly, RequireAccount } from '@/features/auth/guards'
import { useAccount } from '@/features/auth/queries'
import { HomePage } from '@/features/home/HomePage'
import { queryClient } from '@/queryClient'

function RootLayout() {
  // Nothing until the session check first answers, so no page flashes before its guard decides.
  // Not isPending: a refetch after a failed check is pending again, and hiding the
  // pages then would remount them on every answer.
  const { data: account, isFetched, isFetching, refetch } = useAccount()
  if (!isFetched) return null

  // Answered, but only with errors (a guest is null, not undefined): the server
  // or its database is down. Coming back to the tab or the button asks again.
  if (account === undefined) return <ErrorPage onRetry={() => refetch()} retrying={isFetching} />

  return <Outlet />
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    // A page that crashes shows this instead of a blank screen; the button reloads.
    errorElement: <ErrorPage />,
    children: [
      {
        // The logged-in pages share the menu and the frame.
        element: (
          <RequireAccount>
            <AppLayout />
          </RequireAccount>
        ),
        children: [
          { index: true, element: <HomePage /> },
          { path: 'beallitasok', element: <AccountPage /> },
        ],
      },
      {
        // One parent for both paths keeps the card mounted, so it can animate
        // between them; the children only name the paths and render nothing.
        element: (
          <GuestOnly>
            <AuthPage />
            <SiteFooter />
          </GuestOnly>
        ),
        children: [
          { path: 'login', element: null },
          { path: 'register', element: null },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-center" />
      {/* Rendered only in development; production builds replace it with nothing. */}
      <ReactQueryDevtools buttonPosition="bottom-right" />
    </QueryClientProvider>
  )
}
