import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link, useLocation } from 'react-router'

import { SoonTooltip } from '@/components/app/SoonTooltip'
import { blurAfterPointerClick } from '@/lib/focus'
import { cn } from '@/lib/utils'

import { isActive, TAB_NAV } from './nav'

const tabBase = 'flex h-full min-h-11 flex-col items-center justify-center gap-1 text-[11px] leading-none font-medium'

/**
 * Phones: the pages along the bottom edge, in thumb reach. Bolt and Közösség
 * lead to their own pages here instead of opening a dropdown. Clear of the
 * home indicator on phones that have one.
 */
export function MobileTabBar() {
  const { pathname } = useLocation()

  return (
    <nav
      aria-label="Főmenü"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/8 bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      {/* h-16: AppLayout keeps the same room free under the footer. */}
      <ul className="grid h-16 grid-cols-5">
        {TAB_NAV.map((item) => {
          const icon = <FontAwesomeIcon icon={item.icon} className="size-5" aria-hidden="true" />

          if (item.comingSoon) {
            return (
              <li key={item.label}>
                <SoonTooltip>
                  <span aria-disabled="true" className={cn(tabBase, 'cursor-not-allowed text-muted-foreground/45')}>
                    {icon}
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
                  'transition-colors outline-none focus-visible:bg-white/6',
                  current ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
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
