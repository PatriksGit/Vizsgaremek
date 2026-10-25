import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import { faChevronDown, faGear, faRightFromBracket } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link, NavLink, useLocation } from 'react-router'
import { toast } from 'sonner'

import { IconBadge } from '@/components/app/IconBadge'
import { PlayerHead } from '@/components/app/PlayerHead'
import { SoonTooltip } from '@/components/app/SoonTooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { site } from '@/config/site'
import { formMessage } from '@/features/auth/errors'
import { useAccount, useLogout } from '@/features/auth/queries'
import { registrationDate } from '@/features/home/registration'
import { blurAfterPointerClick } from '@/lib/focus'
import { cn } from '@/lib/utils'

import { ACCOUNT_NAV, isActive, NAV, type NavItem } from './nav'
import { pageWidth } from './pageWidth'

/** Keyboard focus only: a mouse click lets go of the focus (blurAfterPointerClick), so no ring stays behind. */
const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-primary/50'

/** The bars' surface: the page's own dark tone, see-through enough for the backdrop's warm glow to show. */
const surface = 'relative border-b border-white/6 bg-background/70 backdrop-blur-xl'

/** A faint gold line along the bar's bottom edge, brightest in the middle, under the menu. */
const goldEdge = (
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-linear-to-r from-transparent via-primary/45 to-transparent"
  />
)

/** The dropdowns' surface: the cards' dark tone, lifted off the page by a soft shadow below. */
const menuSurface = 'rounded-xl border border-white/8 bg-popover/95 p-1.5 shadow-xl shadow-black/50 ring-0 backdrop-blur-xl'

/** A row in a dropdown; highlighted by the pointer or the arrow keys. */
const menuRow = 'group/row flex items-center gap-3 rounded-lg px-3 text-sm outline-none select-none data-highlighted:bg-white/6'

/**
 * A menu item on the navbar, full height. Its gold line sits on the bar's
 * bottom edge: grown from the middle on hover or while its dropdown is open,
 * full and bright on the current page.
 */
const itemBase = cn(
  'relative flex h-full items-center gap-1.5 px-3 text-sm font-medium transition-colors',
  'after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:scale-x-0 after:rounded-full after:bg-primary',
  'after:transition-transform after:duration-300 after:ease-out motion-reduce:after:transition-none',
)
const idle = cn(
  'text-muted-foreground hover:text-foreground hover:after:scale-x-100 hover:after:bg-primary/40',
  'data-popup-open:text-foreground data-popup-open:after:scale-x-100 data-popup-open:after:bg-primary/40',
)
const active = 'text-foreground after:scale-x-100'

/**
 * Wide screens: a sticky bar with the logo on the left, the pages in the
 * middle (two of them open a dropdown on hover or click) and the player's menu
 * on the right. Phones get a compact bar with the logo; their pages are in the tab bar.
 */
export function AppNavbar() {
  return (
    <>
      <header className={cn('sticky top-0 z-30 hidden h-17 md:block', surface)}>
        <div className={cn(pageWidth, 'grid h-full grid-cols-[1fr_auto_1fr] items-center gap-4')}>
          <Brand />

          <nav aria-label="Főmenü" className="h-full">
            <ul className="flex h-full items-center">
              {NAV.map((item) => (
                <li key={item.label} className="h-full">
                  <DesktopNavItem item={item} />
                </li>
              ))}
            </ul>
          </nav>

          <div className="justify-self-end">
            <AccountMenu />
          </div>
        </div>
        {goldEdge}
      </header>

      <header className={cn('sticky top-0 z-30 h-15 md:hidden', surface)}>
        <div className={cn(pageWidth, 'flex h-full items-center')}>
          <Brand />
        </div>
        {goldEdge}
      </header>
    </>
  )
}

/** The logo and the name, leading to the overview. The name gives way on the tightest navbar. */
function Brand() {
  return (
    <Link
      to="/"
      onClick={blurAfterPointerClick}
      className={cn('flex shrink-0 items-center gap-2.5 justify-self-start rounded-lg', focusRing)}
    >
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
        <span aria-disabled="true" className={cn(itemBase, 'cursor-not-allowed text-muted-foreground/50')}>
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
      {/* Opens on hover too; a click, Enter or the down arrow still open it, and it closes a moment after the pointer leaves. */}
      <DropdownMenuTrigger
        openOnHover
        delay={60}
        closeDelay={150}
        className={cn(itemBase, focusRing, 'group cursor-pointer', current ? active : idle)}
      >
        {item.label}
        <FontAwesomeIcon
          icon={faChevronDown}
          className="size-2.5 opacity-70 transition-transform duration-200 group-data-popup-open:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent sideOffset={4} className={cn(menuSurface, 'w-80')}>
        {item.children.map((child) => {
          const here = child.to === pathname
          const content = (
            <>
              <IconBadge
                icon={child.icon}
                tone="gold"
                className="size-9 rounded-lg transition-colors group-data-highlighted/row:bg-primary/25"
              />
              <span className="flex min-w-0 flex-col">
                <span className={cn('font-medium', here ? 'text-primary' : 'text-foreground')}>{child.label}</span>
                {child.description && <span className="text-sm text-muted-foreground">{child.description}</span>}
              </span>
            </>
          )

          // A page in the dropdown that is not built yet: listed, but cannot be picked.
          if (child.comingSoon) {
            return (
              <MenuPrimitive.Item key={child.label} disabled className={cn(menuRow, 'py-2.5 opacity-50')}>
                {content}
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">Hamarosan</span>
              </MenuPrimitive.Item>
            )
          }

          return (
            <MenuPrimitive.LinkItem
              key={child.label}
              closeOnClick
              render={<Link to={child.to} aria-current={here ? 'page' : undefined} />}
              className={cn(menuRow, 'py-2.5')}
            >
              {content}
            </MenuPrimitive.LinkItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** The player's head and name, opening their registration date, the settings and logging out. */
function AccountMenu() {
  const { data: account } = useAccount()
  const logout = useLogout()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Fiók menü"
        className={cn(
          'group flex h-11 cursor-pointer items-center gap-2.5 rounded-lg pr-2.5 pl-1.5 transition-colors hover:bg-white/6 data-popup-open:bg-white/6',
          focusRing,
        )}
      >
        <PlayerHead className="size-8" />
        <span className="hidden max-w-36 truncate text-sm font-medium text-foreground lg:inline">{account?.display_name}</span>
        <FontAwesomeIcon
          icon={faChevronDown}
          className="size-2.5 text-muted-foreground transition-transform duration-200 group-data-popup-open:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className={cn(menuSurface, 'w-64')}>
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
        <MenuPrimitive.LinkItem closeOnClick render={<Link to={ACCOUNT_NAV.to} />} className={cn(menuRow, 'h-10 text-foreground')}>
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
