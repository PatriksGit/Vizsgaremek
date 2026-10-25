import { Outlet } from 'react-router'

import { ServerBackdrop } from '@/components/ServerBackdrop'
import { SiteFooter } from '@/components/SiteFooter'
import { cn } from '@/lib/utils'

import { AppNavbar } from './AppNavbar'
import { MobileTabBar } from './MobileTabBar'
import { pageWidth } from './pageWidth'

/** The frame of every logged-in page: the navbar (on phones the tab bar too), the server backdrop and the footer. */
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
      <AppNavbar />

      {/*
       * The server backdrop fills the whole window behind the bars and the
       * content alike, so its warm glow reaches the see-through bars too.
       * Darker and blurrier than behind the login card, so no colour of the
       * screenshot shows through the cards.
       */}
      <div aria-hidden="true" className="fixed inset-0 -z-10">
        <ServerBackdrop />
        <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
      </div>

      <main id="tartalom" tabIndex={-1} className={cn(pageWidth, 'relative isolate min-h-dvh pt-6 pb-8 outline-none')}>
        <Outlet />
      </main>

      <SiteFooter />

      {/* Phones: room under the footer as tall as the tab bar, so it never covers the last line. */}
      <div aria-hidden="true" className="h-[calc(4rem+env(safe-area-inset-bottom))] bg-bedrock md:hidden" />
      <MobileTabBar />
    </>
  )
}
