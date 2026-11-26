import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link, useLocation } from 'react-router'

import { focusRing } from '@/components/app/interactive'
import { quietTileLook } from '@/components/app/Panel'
import { Pill } from '@/components/app/Pill'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
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
import { blurAfterPointerClick } from '@/lib/focus'
import { cn } from '@/lib/utils'

import { isActive, isPage, NAV, type NavItem, type NavLinkItem } from './nav'
import { useProtectedNav } from './protectedNav'
import { PlayerCard } from './PlayerCard'

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
        state === 'idle' && quietTileLook,
        state === 'idle' && 'group-hover/row:text-foreground',
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
  // The groups behind a permission or a live grant (protectedNav.ts), after the menu everyone sees.
  const protectedNav = useProtectedNav()

  return (
    <Sidebar className="sticky top-0 hidden h-svh shrink-0 gap-4 border-r border-sidebar-border px-4 py-5 md:flex">
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
            {[...NAV, ...protectedNav].map((item) => (
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

/** A page of its own on the top level: a gold tile and label, with a gold bar on the sidebar's edge, while it or a page under it is open. */
function TopLink({ item }: { item: NavItem }) {
  const { pathname } = useLocation()
  const current = isActive(item, pathname)

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
        <Pill tone="quiet" className="h-5 shrink-0 border border-transparent px-2 py-0.5 text-[11px] whitespace-nowrap">
          Hamarosan
        </Pill>
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
