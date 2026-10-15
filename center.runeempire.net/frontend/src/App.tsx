import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router'

import { SiteFooter } from '@/components/SiteFooter'
import { AuthPage } from '@/features/auth/AuthPage'

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
        // One parent for both paths keeps the card mounted, so it can animate
        // between them; the children only name the paths and render nothing.
        element: <AuthPage />,
        children: [
          { path: 'login', element: null },
          { path: 'register', element: null },
        ],
      },
      // No home page yet: everything leads to the login.
      { path: '*', element: <Navigate to="/login" replace /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
