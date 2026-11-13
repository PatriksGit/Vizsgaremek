import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link, useLocation } from 'react-router'

import { PlayerHead } from '@/components/app/PlayerHead'
import { SoonTooltip } from '@/components/app/SoonTooltip'
import { useAccount } from '@/features/auth/queries'
import { blurAfterPointerClick } from '@/lib/focus'
import { cn } from '@/lib/utils'

import { ACCOUNT_NAV, isActive, TAB_NAV } from './nav'

const tabBase = 'flex h-full min-h-11 flex-col items-center justify-center gap-1 text-[11px] leading-none'

/** The icon's pill: gold-tinted under the open page's icon, like the sidebar's tiles. */
const pill = 'grid h-7 w-12 place-items-center rounded-full transition-colors'

/**
 * Phones: the pages along the bottom edge, in thumb reach. Rúnák leads to
 * its own page here instead of opening a group; the account tab
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
          const icon =
            item.to === ACCOUNT_NAV.to ? (
              <PlayerHead name={account?.display_name} className="size-6 rounded-[5px]" />
            ) : (
              <FontAwesomeIcon icon={item.icon} className="size-4.75" aria-hidden="true" />
            )

          if (item.comingSoon) {
            return (
              <li key={item.label}>
                <SoonTooltip>
                  <span aria-disabled="true" className={cn(tabBase, 'cursor-not-allowed font-semibold text-muted-foreground/45')}>
                    <span className={pill}>{icon}</span>
                    {item.label}
                    <span className="sr-only"> (hamarosan)</span>
                  </span>
                </SoonTooltip>
              </li>
            )
          }

          const current = isActive(item, pathname)
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
                <span className={cn(pill, current && 'bg-primary/15')}>{icon}</span>
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
