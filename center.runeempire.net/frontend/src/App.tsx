import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router'

import { SiteFooter } from '@/components/SiteFooter'
import { Toaster } from '@/components/ui/sonner'
import { AuthPage } from '@/features/auth/AuthPage'
import { GuestOnly, RequireAccount } from '@/features/auth/guards'
import { useAccount } from '@/features/auth/queries'
import { HomePage } from '@/features/home/HomePage'
import { queryClient } from '@/queryClient'

function RootLayout() {
  // Nothing until the session check answers, so the footer does not flash alone.
  const { isPending } = useAccount()
  if (isPending) return null

  return (
    <>
      <Outlet />
      <SiteFooter />
    </>
  )
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: (
          <RequireAccount>
            <HomePage />
          </RequireAccount>
        ),
      },
      {
        // One parent for both paths keeps the card mounted, so it can animate
        // between them; the children only name the paths and render nothing.
        element: (
          <GuestOnly>
            <AuthPage />
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
      <ReactQueryDevtools buttonPosition="bottom-left" />
    </QueryClientProvider>
  )
}
