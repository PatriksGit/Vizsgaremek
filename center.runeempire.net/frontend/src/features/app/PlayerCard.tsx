import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import { faGear, faRightFromBracket } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link, useLocation } from 'react-router'

import { focusRing } from '@/components/app/interactive'
import { popupLook } from '@/components/app/Panel'
import { PlayerHead } from '@/components/app/PlayerHead'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useAccount, useLogout } from '@/features/auth/queries'
import { useManagementLogout, useManagementPresence, useOpenManagement } from '@/features/management/api'
import { cn } from '@/lib/utils'

import { ACCOUNT_NAV, isAccountArea, isPage, MANAGEMENT_NAV } from './nav'

/** A row in the account menu; highlighted by the pointer or the arrow keys. */
const menuRow = 'flex h-10 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm font-semibold outline-none select-none'

/** The player at the bottom: their head, name and a gear; the whole card opens the settings and logout above it. */
export function PlayerCard() {
  const { data: account } = useAccount()
  const { pathname } = useLocation()
  const logout = useLogout()
  const openManagement = useOpenManagement()
  // A live grant: the sidebar's Management group navigates, so this menu offers only the way out (owner, 2026-11-26).
  const managementSignedIn = useManagementPresence()
  const managementLogout = useManagementLogout()
  // The gear is gold on every page of this menu (Management too, review 2026-11-23 app-shell K3);
  // each row in it marks only its own page.
  // With the Management group shown, /management/* marks that group, not this menu.
  const inAccountArea = managementSignedIn ? isPage(ACCOUNT_NAV.to, pathname) : isAccountArea(pathname)

  return (
    <DropdownMenu>
      {/* The whole card opens the menu: the head, the name and the gear (owner, 2026-11-13). */}
      <DropdownMenuTrigger
        aria-label="Fiók menü"
        className={cn(
          'group/card flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-card py-2 pr-2 pl-2.5 text-left transition-colors',
          'hover:border-line hover:bg-raised data-popup-open:border-primary/30 data-popup-open:bg-raised',
          focusRing,
        )}
      >
        <PlayerHead name={account?.display_name} className="size-8 shrink-0 rounded-sm" />
        <span className="min-w-0 flex-1 truncate font-bold text-foreground">{account?.display_name}</span>
        <span
          aria-hidden="true"
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-lg transition-colors',
            inAccountArea ? 'bg-primary/10 text-primary' : 'text-muted-foreground group-hover/card:text-foreground',
            'group-data-popup-open/card:text-foreground',
          )}
        >
          <FontAwesomeIcon
            icon={faGear}
            className="size-4.25 transition-transform duration-300 group-data-popup-open/card:rotate-60 motion-reduce:transition-none"
          />
        </span>
      </DropdownMenuTrigger>
      {/* As wide as the card, right above it. */}
      <DropdownMenuContent
        side="top"
        align="start"
        sideOffset={8}
        className={cn('w-(--anchor-width) rounded-xl p-1.5 ring-0', popupLook)}
      >
        {account?.can_manage && !managementSignedIn && (
          <MenuPrimitive.LinkItem
            closeOnClick
            // The router's link, like every other page (owner, 2026-11-23: no full reload); the click
            // asks first (useOpenManagement) and goes to Google only when there is no live grant.
            onClick={openManagement}
            render={<Link to={MANAGEMENT_NAV.to} aria-current={isPage(MANAGEMENT_NAV.to, pathname) ? 'page' : undefined} />}
            className={cn(menuRow, 'text-foreground data-highlighted:bg-sunken')}
          >
            <FontAwesomeIcon icon={MANAGEMENT_NAV.icon} className="size-3.75 text-muted-foreground" aria-hidden="true" />
            {MANAGEMENT_NAV.label}
          </MenuPrimitive.LinkItem>
        )}
        {/* Only while the cached answer says signed in (owner, 2026-11-26: the logout left the management page). */}
        {managementSignedIn && (
          <MenuPrimitive.Item
            onClick={() => managementLogout.mutate()}
            disabled={managementLogout.isPending}
            className={cn(menuRow, 'text-foreground data-disabled:opacity-60 data-highlighted:bg-sunken')}
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="size-3.75 text-muted-foreground" aria-hidden="true" />
            Kilépés a managementből
          </MenuPrimitive.Item>
        )}
        <MenuPrimitive.LinkItem
          closeOnClick
          render={<Link to={ACCOUNT_NAV.to} aria-current={isPage(ACCOUNT_NAV.to, pathname) ? 'page' : undefined} />}
          className={cn(menuRow, 'text-foreground data-highlighted:bg-sunken')}
        >
          <FontAwesomeIcon icon={ACCOUNT_NAV.icon} className="size-3.75 text-muted-foreground" aria-hidden="true" />
          Beállítások
        </MenuPrimitive.LinkItem>
        {/* Logged out: the guard sends the player to the login page. */}
        <MenuPrimitive.Item
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className={cn(
            menuRow,
            'text-foreground data-disabled:opacity-60 data-highlighted:bg-danger/10 data-highlighted:text-danger',
          )}
        >
          <FontAwesomeIcon icon={faRightFromBracket} className="size-3.75" aria-hidden="true" />
          {logout.isPending ? 'Kijelentkezés…' : 'Kijelentkezés'}
        </MenuPrimitive.Item>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
