import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import { faChevronDown, faGear, faGem, faRightFromBracket } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link, NavLink, useLocation } from 'react-router'
import { toast } from 'sonner'

import { PlayerHead } from '@/components/app/PlayerHead'
import { SoonTooltip } from '@/components/app/SoonTooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { site } from '@/config/site'
import { formMessage } from '@/features/auth/errors'
import { useAccount, useLogout } from '@/features/auth/queries'
import { registrationDate } from '@/features/home/registration'
import { blurAfterPointerClick } from '@/lib/focus'
import { cn } from '@/lib/utils'

import { ACCOUNT_NAV, isActive, NAV, type NavItem } from './nav'
import { pageWidth } from './pageWidth'
import { runeCountFormat, useRuneBalance } from './runes'

/** Keyboard focus only: a mouse click lets go of the focus (blurAfterPointerClick), so no ring stays behind. */
const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-primary/50'

/** The bars' surface: the page's own dark tone, see-through enough for the backdrop's warm glow to show. */
const surface = 'border-b border-white/8 bg-background/70 backdrop-blur-xl'

/** A row in a dropdown; highlighted by the pointer or the arrow keys. */
const menuRow = 'flex items-center gap-3 rounded-lg px-3 text-sm outline-none select-none data-highlighted:bg-white/6'

/** A menu item on the navbar: full height, so the active page's gold line sits on the bar's bottom edge. */
const itemBase = 'flex h-full items-center gap-1.5 border-b-2 px-2.5 text-sm font-medium transition-colors lg:px-3'
const idle = 'border-transparent text-muted-foreground hover:text-foreground'
const active = 'border-primary text-foreground'

/**
 * Wide screens: a sticky bar with the logo, the pages (two of them open a
 * dropdown) and on the right the rune balance and the player's menu. Phones get
 * a compact bar with the logo and the balance; their pages are in the tab bar.
 */
export function AppNavbar() {
  return (
    <>
      <header className={cn('sticky top-0 z-30 hidden h-17 md:block', surface)}>
        <div className={cn(pageWidth, 'flex h-full items-center gap-4 lg:gap-8')}>
          <Brand />

          <nav aria-label="Főmenü" className="h-full min-w-0 flex-1">
            <ul className="flex h-full items-center">
              {NAV.map((item) => (
                <li key={item.label} className="h-full">
                  <DesktopNavItem item={item} />
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            <RuneBalancePill />
            <AccountMenu />
          </div>
        </div>
      </header>

      <header className={cn('sticky top-0 z-30 h-15 md:hidden', surface)}>
        <div className={cn(pageWidth, 'flex h-full items-center justify-between gap-3')}>
          <Brand />
          <RuneBalancePill />
        </div>
      </header>
    </>
  )
}

/** The logo and the name, leading to the overview. The name gives way on the tightest navbar. */
function Brand() {
  return (
    <Link to="/" onClick={blurAfterPointerClick} className={cn('flex shrink-0 items-center gap-2.5 rounded-lg', focusRing)}>
      <img src={site.logoUrl} alt="" width={36} height={36} className="size-9" />
      <span className="font-heading text-xl text-foreground md:max-lg:sr-only">{site.name}</span>
    </Link>
  )
}

/** One page on the navbar: a link, a dropdown of its pages, or, until it is built, a faded label. */
function DesktopNavItem({ item }: { item: NavItem }) {
  const { pathname } = useLocation()
  const current = isActive(item, pathname)

  if (item.comingSoon) {
    return (
      <SoonTooltip side="bottom">
        <span aria-disabled="true" className={cn(itemBase, 'cursor-not-allowed border-transparent text-muted-foreground/50')}>
          {item.label}
          <span className="sr-only"> (hamarosan)</span>
        </span>
      </SoonTooltip>
    )
  }

  if (!item.children) {
    return (
      <NavLink
        to={item.to}
        end
        onClick={blurAfterPointerClick}
        aria-current={current ? 'page' : undefined}
        className={cn(itemBase, focusRing, current ? active : idle)}
      >
        {item.label}
      </NavLink>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(itemBase, focusRing, 'group cursor-pointer', current ? active : idle)}>
        {item.label}
        <FontAwesomeIcon
          icon={faChevronDown}
          className="size-2.5 opacity-70 transition-transform duration-200 group-data-popup-open:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent sideOffset={6} className="w-72 rounded-xl border border-white/8 p-1.5 ring-0 shadow-xl">
        {item.children.map((child) => {
          const content = (
            <>
              <FontAwesomeIcon icon={child.icon} className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="flex min-w-0 flex-col">
                <span className={cn('font-medium', child.to === pathname ? 'text-primary' : 'text-foreground')}>{child.label}</span>
                {child.description && <span className="text-sm text-muted-foreground">{child.description}</span>}
              </span>
            </>
          )

          // A page in the dropdown that is not built yet: listed, but cannot be picked.
          if (child.comingSoon) {
            return (
              <MenuPrimitive.Item key={child.label} disabled className={cn(menuRow, 'items-start py-2.5 opacity-50')}>
                {content}
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">Hamarosan</span>
              </MenuPrimitive.Item>
            )
          }

          return (
            <MenuPrimitive.LinkItem
              key={child.label}
              closeOnClick
              render={<Link to={child.to} aria-current={child.to === pathname ? 'page' : undefined} />}
              className={cn(menuRow, 'items-start py-2.5')}
            >
              {content}
            </MenuPrimitive.LinkItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** The player's runes at a glance, leading to the shop. A skeleton while the balance is unknown. */
function RuneBalancePill() {
  const balance = useRuneBalance()

  return (
    <Link
      to="/bolt"
      onClick={blurAfterPointerClick}
      className={cn(
        'flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/4 pr-3.5 pl-3 text-sm transition-colors hover:border-enchant/40 hover:bg-white/6 md:h-9',
        focusRing,
      )}
    >
      <FontAwesomeIcon icon={faGem} className="size-3.5 text-enchant" aria-hidden="true" />
      {balance === undefined ? (
        <>
          <Skeleton className="h-4 w-8" />
          <span className="sr-only">Rúnák betöltése…</span>
        </>
      ) : (
        <span className="font-semibold text-foreground tabular-nums">{runeCountFormat.format(balance)}</span>
      )}
      <span className="text-muted-foreground">rúna</span>
    </Link>
  )
}

/** The player's head, opening their name, registration date, the settings and logging out. */
function AccountMenu() {
  const { data: account } = useAccount()
  const logout = useLogout()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Fiók menü"
        className={cn(
          'grid size-11 cursor-pointer place-items-center rounded-lg transition-colors hover:bg-white/6 data-popup-open:bg-white/6',
          focusRing,
        )}
      >
        <PlayerHead className="size-9" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-64 rounded-xl border border-white/8 p-1.5 ring-0 shadow-xl">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <PlayerHead className="size-10 shrink-0" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{account?.display_name}</p>
            {account?.registered_at && (
              <p className="text-sm text-muted-foreground">Tag {registrationDate.format(new Date(account.registered_at))} óta</p>
            )}
          </div>
        </div>
        <DropdownMenuSeparator className="bg-white/8" />
        <MenuPrimitive.LinkItem
          closeOnClick
          render={<Link to={ACCOUNT_NAV.to} />}
          className={cn(menuRow, 'h-10 text-foreground')}
        >
          <FontAwesomeIcon icon={faGear} className="size-4 text-muted-foreground" aria-hidden="true" />
          Fiókbeállítások
        </MenuPrimitive.LinkItem>
        {/* Logged out: the guard sends the player to the login page. */}
        <MenuPrimitive.Item
          onClick={() => logout.mutate(undefined, { onError: (error) => toast.error(formMessage(error)) })}
          disabled={logout.isPending}
          className={cn(menuRow, 'h-10 text-foreground data-disabled:opacity-60 data-highlighted:bg-redstone/10 data-highlighted:text-redstone')}
        >
          <FontAwesomeIcon icon={faRightFromBracket} className="size-4" aria-hidden="true" />
          Kijelentkezés
        </MenuPrimitive.Item>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
