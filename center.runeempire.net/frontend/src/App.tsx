import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router'

import { SiteFooter } from '@/components/SiteFooter'
import { AuthPage } from '@/features/auth/AuthPage'
import { AuthProvider, GuestOnly, RequireAccount } from '@/features/auth/AuthProvider'
import { HomePage } from '@/features/home/HomePage'

function RootLayout() {
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
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
