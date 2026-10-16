import { Outlet } from 'react-router'

import { ServerBackdrop } from '@/components/ServerBackdrop'
import { SiteFooter } from '@/components/SiteFooter'

import { AppSidebar, MobileTopBar } from './AppSidebar'

/** The frame of every logged-in page: the sidebar, the server backdrop and the footer. */
export function AppLayout() {
  return (
    <>
      {/* The first Tab stop: past the menu straight to the page. */}
      <a
        href="#tartalom"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Ugrás a tartalomra
      </a>
      <AppSidebar />
      <MobileTopBar />

      {/*
       * The server backdrop fills the whole window behind the sidebar and the
       * content alike, so its warm glow reaches the see-through sidebar too and
       * the two read as one page. Darker and blurrier than behind the login
       * card, so no colour of the screenshot shows through the cards.
       */}
      <div aria-hidden="true" className="fixed inset-0 -z-10">
        <ServerBackdrop />
        <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
      </div>

      {/* Wide screens: everything starts where the sidebar ends. */}
      <div className="relative isolate lg:ml-72">
        {/* Capped in width only on very large screens, so the cards fill the room beside the sidebar without stretching endlessly. */}
        <main id="tartalom" tabIndex={-1} className="mx-auto min-h-dvh w-full max-w-400 px-4 pt-6 pb-8 outline-none sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <div className="bg-bedrock lg:ml-72">
        <SiteFooter />
      </div>
    </>
  )
}
