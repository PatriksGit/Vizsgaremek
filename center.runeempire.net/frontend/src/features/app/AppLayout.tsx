import { Outlet } from 'react-router'

import { ServerBackdrop } from '@/components/ServerBackdrop'
import { SiteFooter } from '@/components/SiteFooter'

import { AppSidebar, MobileTopBar } from './AppSidebar'

/** The frame of every logged-in page: the sidebar, the server backdrop and the footer. */
export function AppLayout() {
  return (
    <>
      <AppSidebar />
      <MobileTopBar />

      {/* Wide screens: everything starts where the sidebar ends. */}
      <div className="relative isolate bg-background lg:ml-60">
        <ServerBackdrop />
        {/* Darker and blurrier than behind the login card, so no colour of the screenshot shows through the cards. */}
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-black/70 backdrop-blur-xl" />
        {/* Capped in width, so the cards do not stretch across a large screen. */}
        <main className="mx-auto min-h-dvh w-full max-w-7xl px-4 pt-6 pb-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <div className="bg-bedrock lg:ml-60">
        <SiteFooter />
      </div>
    </>
  )
}
