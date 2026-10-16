import {
  faBars,
  faCheck,
  faChevronRight,
  faCopy,
  faGear,
  faHourglassHalf,
  faRightFromBracket,
  faServer,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import { toast } from 'sonner'

import { PlayerHead } from '@/components/app/PlayerHead'
import { SoonTooltip } from '@/components/app/SoonTooltip'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { showComingSoon } from '@/config/features'
import { site } from '@/config/site'
import { formMessage } from '@/features/auth/errors'
import { useAccount, useLogout } from '@/features/auth/queries'
import { blurAfterPointerClick } from '@/lib/focus'
import { cn } from '@/lib/utils'

import { APP_NAV, isBuilt, type NavGroup, type NavItem } from './nav'

/** Keyboard focus only: a mouse click lets go of the focus (blurAfterPointerClick), so no ring stays behind. */
const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-primary/50'

/**
 * The sidebar's surface: the page's own dark tone, see-through enough for the
 * backdrop's warm glow to show, split from the content by a faint gold line.
 */
const surface = 'border-primary/15 bg-background/60 backdrop-blur-xl'

const itemBase = 'group flex h-11 items-center gap-3 rounded-lg px-2.5 text-base'

/** A page inside a submenu: shorter, no icon of its own, hanging off the group's guide line. */
const subItemBase = 'flex h-10 items-center gap-3 rounded-lg px-3 text-base'

const idle = 'text-muted-foreground hover:bg-white/6 hover:text-foreground'
const active = 'bg-primary/10 text-primary'

const iconSize = 'size-5.5 shrink-0'

/** The icon of a row that leads somewhere: on hover it turns gold and grows a little. */
const liveIcon = cn(
  iconSize,
  'transition-[color,scale] duration-200 group-hover:scale-110 group-hover:text-primary motion-reduce:transition-none motion-reduce:group-hover:scale-100',
)

/** Which submenus the player opened or closed, so the menu looks the same on the next page load. */
const OPEN_GROUPS_KEY = 'sidebar-open-groups'

function readOpenGroups(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(OPEN_GROUPS_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function saveOpenGroups(groups: Record<string, boolean>) {
  try {
    localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(groups))
  } catch {
    // Storage blocked (private window): the menu just forgets.
  }
}

/**
 * Wide screens: the sidebar, always open, fixed along the left edge. Its
 * height comes from top and bottom alone: 100dvh would also count the strip
 * under a horizontal scrollbar, pushing the bottom out of sight.
 */
export function AppSidebar() {
  return (
    <aside className={cn('fixed inset-y-0 left-0 z-20 hidden w-72 flex-col border-r lg:flex', surface)}>
      <SidebarContent />
    </aside>
  )
}

/** Narrow screens: a top bar whose menu button opens the same sidebar in a sheet. */
export function MobileTopBar() {
  const [open, setOpen] = useState(false)

  return (
    <header className={cn('sticky top-0 z-20 flex h-14 items-center gap-3 border-b px-3 lg:hidden', surface)}>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="ghost" size="icon-lg" aria-label="Menü megnyitása" className="size-11" />}>
          <FontAwesomeIcon icon={faBars} className="size-4.5" aria-hidden="true" />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 gap-0 border-white/8 bg-background p-0">
          <SheetTitle className="sr-only">Főmenü</SheetTitle>
          {/* Picking a page closes the sheet. */}
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <img src={site.logoUrl} alt="" width={32} height={32} className="size-8" />
      <span className="font-heading text-lg text-foreground">{site.name}</span>
    </header>
  )
}

type SidebarContentProps = {
  /** Called after the player picks a page, so the phone sheet can close. */
  onNavigate?: () => void
}

/**
 * Logo on top, the pages in the middle (the only part that scrolls),
 * the player and logging out at the bottom. A group with two or more pages becomes a
 * submenu that opens and closes; a group of one is just its page. Unbuilt
 * pages show as coming soon in development only.
 */
function SidebarContent({ onNavigate }: SidebarContentProps) {
  const [openGroups, setOpenGroups] = useState(readOpenGroups)

  const groups = APP_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => isBuilt(item) || showComingSoon),
  })).filter((group) => group.items.length > 0)

  function toggleGroup(title: string, open: boolean) {
    const next = { ...openGroups, [title]: open }
    setOpenGroups(next)
    saveOpenGroups(next)
  }

  return (
    <>
      <div className="flex h-16 shrink-0 items-center gap-3 px-5">
        <img src={site.logoUrl} alt="" width={40} height={40} className="size-10" />
        <span className="font-heading text-xl text-foreground">{site.name}</span>
      </div>

      <nav aria-label="Főmenü" className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <ul className="flex flex-col gap-1">
          {groups.map((group) => (
            <li key={group.title}>
              {group.items.length >= 2 ? (
                <SubMenu
                  group={group}
                  open={openGroups[group.title]}
                  onOpenChange={(open) => toggleGroup(group.title, open)}
                  onNavigate={onNavigate}
                />
              ) : (
                <MenuLink item={group.items[0]} onNavigate={onNavigate} />
              )}
            </li>
          ))}
        </ul>
      </nav>

      {site.serverAddress && <ServerAddress address={site.serverAddress} />}

      <div className="flex shrink-0 flex-col gap-1 border-t border-white/8 px-3 pt-3 pb-10">
        <PlayerCard onNavigate={onNavigate} />
        <LogoutButton />
      </div>
    </>
  )
}

/**
 * The server's address, copied with one click: what a player needs on every
 * page. The online player count joins it once the game server reports it.
 */
function ServerAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(`Nem sikerült a vágólapra másolni. A szerver címe: ${address}`)
    }
  }

  return (
    <div className="shrink-0 px-3 pb-3">
      <button
        type="button"
        onClick={(event) => {
          blurAfterPointerClick(event)
          void copy()
        }}
        className={cn(
          'group flex h-11 w-full items-center gap-3 rounded-lg border border-white/8 bg-white/3 px-3 text-left transition-colors hover:border-primary/30 hover:bg-white/6',
          focusRing,
        )}
      >
        <FontAwesomeIcon icon={faServer} className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">{address}</span>
        <span className="sr-only">{copied ? ': kimásolva' : ': cím másolása'}</span>
        <FontAwesomeIcon
          icon={copied ? faCheck : faCopy}
          className={cn('size-4 shrink-0 transition-colors', copied ? 'text-xp' : 'text-muted-foreground group-hover:text-primary')}
          aria-hidden="true"
        />
      </button>
    </div>
  )
}

/** The player's head and name, leading to their account settings. */
function PlayerCard({ onNavigate }: { onNavigate?: () => void }) {
  const { data: account } = useAccount()

  return (
    <NavLink
      to="/beallitasok"
      end
      onClick={(event) => {
        blurAfterPointerClick(event)
        onNavigate?.()
      }}
      className={({ isActive }) =>
        cn(
          'group flex h-15 items-center gap-3 rounded-lg px-2.5 transition-colors',
          focusRing,
          isActive ? 'bg-primary/10' : 'hover:bg-white/6',
        )
      }
    >
      <PlayerHead className="size-10 shrink-0 transition-[scale] duration-200 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-semibold text-foreground">{account?.display_name}</span>
        <span className="text-sm text-muted-foreground">Fiók kezelése</span>
      </span>
      <FontAwesomeIcon
        icon={faGear}
        className="ml-auto size-4 shrink-0 text-muted-foreground transition-[color,rotate] duration-300 group-hover:rotate-45 group-hover:text-primary motion-reduce:transition-none motion-reduce:group-hover:rotate-0"
        aria-hidden="true"
      />
    </NavLink>
  )
}

type SubMenuProps = {
  group: NavGroup
  /** The player's own choice; until they make one, the group holding the current page starts open. */
  open: boolean | undefined
  onOpenChange: (open: boolean) => void
  onNavigate?: () => void
}

/** A group's row, which opens its pages underneath, hanging off a faint guide line. */
function SubMenu({ group, open, onOpenChange, onNavigate }: SubMenuProps) {
  const { pathname } = useLocation()
  const holdsCurrentPage = group.items.some((item) => isBuilt(item) && item.to === pathname)
  const isOpen = open ?? holdsCurrentPage

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <CollapsibleTrigger
        onClick={blurAfterPointerClick}
        className={cn(
          itemBase,
          'w-full transition-colors',
          focusRing,
          // Closed over the current page: the row itself says where the player is.
          holdsCurrentPage && !isOpen ? 'text-primary hover:bg-white/5' : idle,
        )}
      >
        <FontAwesomeIcon icon={group.icon} className={liveIcon} aria-hidden="true" />
        {group.title}
        <FontAwesomeIcon
          icon={faChevronRight}
          className={cn('ml-auto size-3 shrink-0 transition-transform duration-200 motion-reduce:transition-none', isOpen && 'rotate-90')}
          aria-hidden="true"
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0 motion-reduce:transition-none">
        {/* The guide line sits under the group icon's centre. */}
        <ul className="mt-1 ml-[21px] flex flex-col gap-1 border-l border-white/10 pl-2.5">
          {group.items.map((item) => (
            <li key={item.label}>
              <MenuLink item={item} onNavigate={onNavigate} nested />
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}

type MenuLinkProps = {
  item: NavItem
  onNavigate?: () => void
  /** Inside a submenu: the shorter row without an icon. */
  nested?: boolean
}

/** One page: a link once it is built; until then a faded row with an hourglass that says "Hamarosan" on hover. */
function MenuLink({ item, onNavigate, nested = false }: MenuLinkProps) {
  const base = nested ? subItemBase : itemBase

  if (!isBuilt(item)) {
    return (
      <SoonTooltip side="right">
        <span aria-disabled="true" className={cn(base, 'cursor-not-allowed text-muted-foreground/60')}>
          {!nested && <FontAwesomeIcon icon={item.icon} className={iconSize} aria-hidden="true" />}
          <span className="min-w-0 truncate">{item.label}</span>
          <FontAwesomeIcon icon={faHourglassHalf} className="ml-auto size-3 shrink-0 opacity-70" aria-hidden="true" />
          <span className="sr-only"> (hamarosan)</span>
        </span>
      </SoonTooltip>
    )
  }

  return (
    <NavLink
      to={item.to}
      end
      onClick={(event) => {
        blurAfterPointerClick(event)
        onNavigate?.()
      }}
      className={({ isActive }) => cn(base, 'transition-colors', focusRing, isActive ? active : idle)}
    >
      {!nested && <FontAwesomeIcon icon={item.icon} className={liveIcon} aria-hidden="true" />}
      {item.label}
    </NavLink>
  )
}

/** Logging out, kept off the window's bottom edge: like a menu item, turning red on hover. */
function LogoutButton() {
  const logout = useLogout()

  return (
    <button
      type="button"
      // Logged out: the guard sends the player to the login page.
      onClick={(event) => {
        blurAfterPointerClick(event)
        logout.mutate(undefined, {
          onError: (error) => toast.error(formMessage(error)),
        })
      }}
      disabled={logout.isPending}
      className={cn(
        itemBase,
        'w-full text-muted-foreground transition-colors hover:bg-redstone/10 hover:text-redstone disabled:opacity-60',
        focusRing,
      )}
    >
      {/* Grows on hover like the menu's icons, but stays red rather than turning gold. */}
      <FontAwesomeIcon
        icon={faRightFromBracket}
        className={cn(
          iconSize,
          'transition-[scale] duration-200 group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100',
        )}
        aria-hidden="true"
      />
      {logout.isPending ? 'Kijelentkezés…' : 'Kijelentkezés'}
    </button>
  )
}
