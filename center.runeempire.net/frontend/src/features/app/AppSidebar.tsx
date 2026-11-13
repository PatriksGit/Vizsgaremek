import { Menu as MenuPrimitive } from '@base-ui/react/menu'
import { ChevronRight, LogOut, Settings } from 'lucide-react'
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
  SidebarGroup,
  SidebarGroupLabel,
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

/** A top-level row: an icon and a label, 40 px tall. */
const row = cn('flex min-h-10 w-full items-center gap-3 rounded-lg px-2.5 text-left text-sm font-semibold transition-colors', focusRing)

/** A page inside a group, 34 px tall. */
const subRow = cn('flex min-h-8.5 items-center gap-2 rounded-md px-2.5 text-sm font-semibold transition-colors', focusRing)

/**
 * Wide screens: the menu down the left edge, always open, sticking while the
 * page scrolls. The logo on top, the pages under "Menü" (Fiók, Bolt and
 * Közösség open and close like folders, sliding), the player and a gear at
 * the bottom that opens the settings and logout. Phones get the tab bar instead (MobileTabBar).
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

      <SidebarContent>
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="h-auto px-2.5 pb-1.5 text-[11px] font-bold tracking-[0.13em] text-faint uppercase">
            Menü
          </SidebarGroupLabel>
          <nav aria-label="Főmenü">
            <SidebarMenu className="gap-1">
              {NAV.map((item) => (
                <SidebarMenuItem key={item.label}>
                  {item.children ? <NavGroup item={item} /> : <TopLink item={item} />}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </nav>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-0">
        <PlayerCard />
      </SidebarFooter>
    </Sidebar>
  )
}

/** A page of its own on the top level (Áttekintés): gold, with a gold bar on the sidebar's edge, while it is open. */
function TopLink({ item }: { item: NavItem }) {
  const { pathname } = useLocation()
  const current = isPage(item.to, pathname)
  const Icon = item.icon

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
      {current && <span aria-hidden="true" className="absolute top-2.25 bottom-2.25 -left-4 w-0.75 rounded-r-sm bg-primary" />}
      <Icon className="size-4.5" aria-hidden="true" />
      {item.label}
    </Link>
  )
}

/** A folder of pages; open from the start, so every page is one click away. */
function NavGroup({ item }: { item: NavItem }) {
  const { pathname } = useLocation()
  const Icon = item.icon

  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger
        className={cn(
          row,
          'group/trigger cursor-pointer',
          isActive(item, pathname) ? 'text-foreground' : 'text-soft',
          'hover:bg-sidebar-accent hover:text-foreground',
        )}
      >
        <Icon className="size-4.5" aria-hidden="true" />
        <span className="flex-1">{item.label}</span>
        <ChevronRight
          className="size-3.5 text-faint transition-transform duration-200 group-data-panel-open/trigger:rotate-90 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </CollapsibleTrigger>
      {/* Slides open and shut instead of jumping: Base UI measures the height into --collapsible-panel-height. */}
      <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0 motion-reduce:transition-none">
        <SidebarMenuSub className="mx-0 mt-0.5 mb-1.5 ml-4.75 translate-x-0 gap-0.5 border-line py-0 pr-0 pl-3">
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

/** A row in the gear's menu; highlighted by the pointer or the arrow keys. */
const menuRow = 'flex h-10 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm font-semibold outline-none select-none'

/** The player at the bottom: their head and name, and the gear that opens the settings and logout above it. */
function PlayerCard() {
  const { data: account } = useAccount()
  const { pathname } = useLocation()
  const logout = useLogout()
  const current = isPage(ACCOUNT_NAV.to, pathname)

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card py-2 pr-2 pl-2.5">
      <PlayerHead name={account?.display_name} className="size-8 shrink-0 rounded-sm" />
      <span className="min-w-0 flex-1 truncate font-bold text-foreground">{account?.display_name}</span>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Fiók menü"
          className={cn(
            'group/gear grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg transition-colors',
            current ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-raised hover:text-foreground',
            'data-popup-open:bg-raised data-popup-open:text-foreground',
            focusRing,
          )}
        >
          <Settings
            className="size-4.75 transition-transform duration-300 group-data-popup-open/gear:rotate-60 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="end"
          alignOffset={-8}
          sideOffset={14}
          className="w-54 rounded-xl border border-[#2f2a21] p-1.5 shadow-[0_12px_32px_rgb(0_0_0/0.55)] ring-0"
        >
          <MenuPrimitive.LinkItem
            closeOnClick
            render={<Link to={ACCOUNT_NAV.to} aria-current={current ? 'page' : undefined} />}
            className={cn(menuRow, 'text-foreground data-highlighted:bg-sunken')}
          >
            <Settings className="size-4 text-muted-foreground" aria-hidden="true" />
            Beállítások
          </MenuPrimitive.LinkItem>
          {/* Logged out: the guard sends the player to the login page. */}
          <MenuPrimitive.Item
            onClick={() => logout.mutate(undefined, { onError: (error) => toast.error(formMessage(error)) })}
            disabled={logout.isPending}
            className={cn(menuRow, 'text-foreground data-disabled:opacity-60 data-highlighted:bg-danger/10 data-highlighted:text-danger')}
          >
            <LogOut className="size-4" aria-hidden="true" />
            {logout.isPending ? 'Kijelentkezés…' : 'Kijelentkezés'}
          </MenuPrimitive.Item>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
