import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faChevronRight, faGear, faRightFromBracket } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link, useLocation } from 'react-router'
import { toast } from 'sonner'

import { PlayerHead } from '@/components/app/PlayerHead'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { site } from '@/config/site'
import { formMessage } from '@/features/auth/errors'
import { useAccount, useLogout } from '@/features/auth/queries'
import { blurAfterPointerClick } from '@/lib/focus'
import { cn } from '@/lib/utils'

import { ACCOUNT_NAV, isActive, isPage, NAV, type NavItem, type NavLinkItem } from './nav'

/** Keyboard focus only: a mouse click lets go of the focus (blurAfterPointerClick), so no ring stays behind. */
const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-primary/60'

/** A top-level row: the icon on its tile and the label, 44 px tall. */
const row = cn(
  'group/row flex min-h-11 w-full items-center gap-3 rounded-xl px-1.5 text-left text-[15px] font-semibold transition-colors',
  focusRing,
)

/** A page inside a group, 36 px tall; its text lines up with the labels above. */
const subRow = cn('flex min-h-9 items-center gap-2 rounded-lg px-2.5 text-sm font-semibold transition-colors', focusRing)

type TileState = 'current' | 'inside' | 'idle'

/**
 * The menu icon on its own small tile, like the overview's stat cards: quiet
 * by default, solid gold on the open page, gold-tinted on a group whose page
 * is open.
 */
function IconTile({ icon, state }: { icon: IconDefinition; state: TileState }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-lg transition-colors',
        state === 'current' && 'bg-primary text-primary-foreground',
        state === 'inside' && 'bg-primary/15 text-primary',
        state === 'idle' &&
          'bg-raised text-soft shadow-[inset_0_0_0_1px_rgb(255_255_255/0.07)] group-hover/row:text-foreground',
      )}
    >
      <FontAwesomeIcon icon={icon} className="size-3.75" />
    </span>
  )
}

/**
 * Wide screens: the menu down the left edge, always open, sticking while the
 * page scrolls. The logo on top, then the pages (Rúnák opens and closes like
 * a folder, sliding), and at the bottom the player's card, which opens the
 * settings and logout. Phones get the tab bar instead (MobileTabBar).
 */
export function AppSidebar() {
  return (
    <Sidebar
      collapsible="none"
      className="sticky top-0 hidden h-svh shrink-0 gap-4 border-r border-sidebar-border px-4 py-5 md:flex"
    >
      <SidebarHeader className="gap-4 p-0">
        <Link to="/" onClick={blurAfterPointerClick} className={cn('flex items-center gap-3 rounded-lg px-2.5 py-1', focusRing)}>
          <img src={site.logoUrl} alt="" width={44} height={44} className="size-11 object-contain" />
          <span className="font-heading text-xl font-bold tracking-wide text-foreground">{site.name}</span>
        </Link>
        <SidebarSeparator className="mx-0" />
      </SidebarHeader>

      {/* Out to the sidebar's edge, so the open page's gold bar is inside the scrolling box and not cut off. */}
      <SidebarContent className="-mx-4 px-4">
        <nav aria-label="Főmenü">
          <SidebarMenu className="gap-1">
            {NAV.map((item) => (
              <SidebarMenuItem key={item.label}>
                {item.children ? <NavGroup item={item} /> : <TopLink item={item} />}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </nav>
      </SidebarContent>

      <SidebarFooter className="p-0">
        <PlayerCard />
      </SidebarFooter>
    </Sidebar>
  )
}

/** A page of its own on the top level: a gold tile and label, with a gold bar on the sidebar's edge, while it is open. */
function TopLink({ item }: { item: NavItem }) {
  const { pathname } = useLocation()
  const current = isPage(item.to, pathname)

  return (
    <Link
      to={item.to}
      onClick={blurAfterPointerClick}
      aria-current={current ? 'page' : undefined}
      className={cn(
        row,
        'relative',
        current ? 'bg-primary/10 font-bold text-primary' : 'text-soft hover:bg-sidebar-accent hover:text-foreground',
      )}
    >
      {current && <span aria-hidden="true" className="absolute top-2.5 bottom-2.5 -left-4 w-0.75 rounded-r-sm bg-primary" />}
      <IconTile icon={item.icon} state={current ? 'current' : 'idle'} />
      {item.label}
    </Link>
  )
}

/** A folder of pages; open from the start, so every page is one click away. */
function NavGroup({ item }: { item: NavItem }) {
  const { pathname } = useLocation()
  const inside = isActive(item, pathname)

  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger
        className={cn(
          row,
          'group/trigger cursor-pointer',
          inside ? 'text-foreground' : 'text-soft',
          'hover:bg-sidebar-accent hover:text-foreground',
        )}
      >
        <IconTile icon={item.icon} state={inside ? 'inside' : 'idle'} />
        <span className="flex-1">{item.label}</span>
        <FontAwesomeIcon
          icon={faChevronRight}
          className="mr-1.5 size-2.75 text-faint transition-transform duration-200 group-data-panel-open/trigger:rotate-90 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </CollapsibleTrigger>
      {/* Slides open and shut instead of jumping: Base UI measures the height into --collapsible-panel-height. */}
      <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0 motion-reduce:transition-none">
        {/* The line runs down from the middle of the group's tile; the pages' text starts where the labels do. */}
        <SidebarMenuSub className="mx-0 mt-0.5 mb-1.5 ml-[21.5px] translate-x-0 gap-0.5 border-line py-0 pr-0 pl-4">
          {item.children?.map((child) => (
            <SidebarMenuSubItem key={child.label}>
              <SubLink item={child} />
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  )
}

/** A page in a folder; one that is not built yet is listed with a "Hamarosan" pill and cannot be opened. */
function SubLink({ item }: { item: NavLinkItem }) {
  const { pathname } = useLocation()

  if (item.comingSoon) {
    return (
      <span aria-disabled="true" className={cn(subRow, 'cursor-not-allowed text-muted-foreground')}>
        <span className="flex-1">{item.label}</span>
        <Badge variant="secondary" className="bg-raised text-[11px] font-bold text-muted-foreground">
          Hamarosan
        </Badge>
      </span>
    )
  }

  const current = isPage(item.to, pathname)
  return (
    <Link
      to={item.to}
      onClick={blurAfterPointerClick}
      aria-current={current ? 'page' : undefined}
      className={cn(
        subRow,
        current ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground',
      )}
    >
      {item.label}
    </Link>
  )
}

/** A row in the account menu; highlighted by the pointer or the arrow keys. */
const menuRow = 'flex h-10 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm font-semibold outline-none select-none'

/** The player at the bottom: their head, name and a gear; the whole card opens the settings and logout above it. */
function PlayerCard() {
  const { data: account } = useAccount()
  const { pathname } = useLocation()
  const logout = useLogout()
  const current = isPage(ACCOUNT_NAV.to, pathname)

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
            current ? 'bg-primary/10 text-primary' : 'text-muted-foreground group-hover/card:text-foreground',
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
        className="w-(--anchor-width) rounded-xl border border-[#2f2a21] p-1.5 shadow-[0_12px_32px_rgb(0_0_0/0.55)] ring-0"
      >
        <MenuPrimitive.LinkItem
          closeOnClick
          render={<Link to={ACCOUNT_NAV.to} aria-current={current ? 'page' : undefined} />}
          className={cn(menuRow, 'text-foreground data-highlighted:bg-sunken')}
        >
          <FontAwesomeIcon icon={faGear} className="size-3.75 text-muted-foreground" aria-hidden="true" />
          Beállítások
        </MenuPrimitive.LinkItem>
        {/* Logged out: the guard sends the player to the login page. */}
        <MenuPrimitive.Item
          onClick={() =>
            logout.mutate(undefined, {
              onError: (error) => toast.error(formMessage(error)),
            })
          }
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
