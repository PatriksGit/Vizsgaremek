import { useState, type CSSProperties } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

import { focusRing } from '@/components/app/interactive'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { site } from '@/config/site'
import { blurAfterPointerClick } from '@/lib/focus'
import { cn } from '@/lib/utils'

import { AppFooter } from './AppFooter'
import { AppSidebar } from './AppSidebar'
import { MobileTabBar } from './MobileTabBar'

/**
 * The frame of every logged-in page. Wide screens: the sidebar on the left,
 * the page beside it. Phones: a slim bar with the logo on top and the tab bar
 * at the bottom. The footer closes every page.
 */
export function AppLayout() {
  // A page reached with router state {quiet: true} skips the page-load build-up (index.css [data-quiet]):
  // e.g. home after a refused management sign-in, so it does not look like a fresh login.
  // Decided once per page: a later entry of the same page (its own menu link, the skip link's #tartalom)
  // has no state, and dropping data-quiet then would replay the build-up on a page already shown.
  const { pathname, state } = useLocation()
  const [arrival, setArrival] = useState({ pathname, quiet: isQuiet(state) })
  if (arrival.pathname !== pathname) setArrival({ pathname, quiet: isQuiet(state) })
  const quiet = arrival.pathname === pathname ? arrival.quiet : isQuiet(state)

  return (
    // 248 px wide, as in the design.
    <SidebarProvider style={{ '--sidebar-width': '15.5rem' } as CSSProperties} data-quiet={quiet || undefined}>
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
        {/*
         * Phones: room under the footer exactly as tall as the tab bar (its 1 px border, pt-2 + h-13 = 3.75rem and
         * pb max(1rem, inset)), so it never covers the last line and leaves no extra gap (review 2026-11-23 AS-N2).
         */}
        <div aria-hidden="true" className="h-[calc(3.75rem+1px+max(1rem,env(safe-area-inset-bottom)))] md:hidden" />
      </SidebarInset>

      <MobileTabBar />
    </SidebarProvider>
  )
}

function isQuiet(state: unknown): boolean {
  return typeof state === 'object' && state !== null && 'quiet' in state && state.quiet === true
}

/** Phones: the logo and the name, leading to the overview. */
function MobileTopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-15 items-center border-b border-sidebar-border bg-sidebar px-4 md:hidden">
      <Link
        to="/"
        onClick={blurAfterPointerClick}
        className={cn('flex min-h-11 items-center gap-2.5 rounded-lg', focusRing)}
      >
        <img src={site.logoUrl} alt="" width={34} height={34} className="size-8.5 object-contain" />
        <span className="font-heading text-lg font-bold text-foreground">{site.name}</span>
      </Link>
    </header>
  )
}
