import { Link, useLocation } from 'react-router'

import { PlayerHead } from '@/components/app/PlayerHead'
import { SoonTooltip } from '@/components/app/SoonTooltip'
import { useAccount } from '@/features/auth/queries'
import { blurAfterPointerClick } from '@/lib/focus'
import { cn } from '@/lib/utils'

import { ACCOUNT_NAV, isActive, isPage, TAB_NAV } from './nav'

const tabBase = 'flex h-full min-h-11 flex-col items-center justify-center gap-1 text-[11px] leading-none'

/**
 * Phones: the pages along the bottom edge, in thumb reach. Bolt and Közösség
 * lead to their own pages here instead of opening a group; the account tab
 * shows the player's head. Clear of the home indicator on phones that have one.
 */
export function MobileTabBar() {
  const { pathname } = useLocation()
  const { data: account } = useAccount()

  return (
    <nav
      aria-label="Főmenü"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-sidebar-border bg-sidebar px-2 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden"
    >
      {/* h-13 plus the padding: AppLayout keeps the same room free under the footer. */}
      <ul className="grid h-13 grid-cols-5">
        {TAB_NAV.map((item) => {
          const Icon = item.icon
          const icon =
            item.to === ACCOUNT_NAV.to ? (
              <PlayerHead name={account?.display_name} className="size-6 rounded-[5px]" />
            ) : (
              <Icon className="size-5.5" strokeWidth={2} aria-hidden="true" />
            )

          if (item.comingSoon) {
            return (
              <li key={item.label}>
                <SoonTooltip>
                  <span aria-disabled="true" className={cn(tabBase, 'cursor-not-allowed font-semibold text-muted-foreground/45')}>
                    {icon}
                    {item.label}
                    <span className="sr-only"> (hamarosan)</span>
                  </span>
                </SoonTooltip>
              </li>
            )
          }

          // The account tab is only the settings page; the Fiók group's history pages have their own tab.
          const current = item.to === ACCOUNT_NAV.to ? isPage(item.to, pathname) : isActive(item, pathname)
          return (
            <li key={item.label}>
              <Link
                to={item.to}
                onClick={blurAfterPointerClick}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  tabBase,
                  'rounded-lg transition-colors outline-none focus-visible:bg-white/6',
                  current ? 'font-extrabold text-primary' : 'font-semibold text-muted-foreground hover:text-foreground',
                )}
              >
                {icon}
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
