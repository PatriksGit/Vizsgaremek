import type { CSSProperties } from 'react'
import { Link, Outlet } from 'react-router'

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { site } from '@/config/site'
import { blurAfterPointerClick } from '@/lib/focus'

import { AppFooter } from './AppFooter'
import { AppSidebar } from './AppSidebar'
import { MobileTabBar } from './MobileTabBar'

/**
 * The frame of every logged-in page. Wide screens: the sidebar on the left,
 * the page beside it. Phones: a slim bar with the logo on top and the tab bar
 * at the bottom. The footer closes every page.
 */
export function AppLayout() {
  return (
    // 248 px wide, as in the design.
    <SidebarProvider style={{ '--sidebar-width': '15.5rem' } as CSSProperties}>
      {/* The first Tab stop: past the menu straight to the page. */}
      <a
        href="#tartalom"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Ugrás a tartalomra
      </a>

      <AppSidebar />

      <SidebarInset id="tartalom" tabIndex={-1} className="min-w-0 outline-none">
        <MobileTopBar />
        <div className="mx-auto flex w-full max-w-360 flex-1 flex-col gap-5 px-4 pt-4 pb-6 md:px-8 md:pt-7">
          <Outlet />
          <AppFooter />
        </div>
        {/* Phones: room under the footer as tall as the tab bar, so it never covers the last line. */}
        <div aria-hidden="true" className="h-[calc(4.75rem+env(safe-area-inset-bottom))] md:hidden" />
      </SidebarInset>

      <MobileTabBar />
    </SidebarProvider>
  )
}

/** Phones: the logo and the name, leading to the overview. */
function MobileTopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-15 items-center border-b border-sidebar-border bg-sidebar px-4 md:hidden">
      <Link
        to="/"
        onClick={blurAfterPointerClick}
        className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <img src={site.logoUrl} alt="" width={34} height={34} className="size-8.5 object-contain" />
        <span className="font-heading text-lg font-bold text-foreground">{site.name}</span>
      </Link>
    </header>
  )
}
