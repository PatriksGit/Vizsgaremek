import { faBars, faRightFromBracket } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'
import { NavLink } from 'react-router'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { showComingSoon } from '@/config/features'
import { site } from '@/config/site'
import { formMessage } from '@/features/auth/errors'
import { useLogout } from '@/features/auth/queries'
import { blurAfterPointerClick } from '@/lib/focus'
import { cn } from '@/lib/utils'

import { APP_NAV, isBuilt } from './nav'

/** Keyboard focus only: a mouse click lets go of the focus (blurAfterPointerClick), so no ring stays behind. */
const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-primary/50'

/** The sidebar's surface: the page's own dark tone, slightly see-through, split from the content by a faint line. */
const surface = 'border-white/8 bg-background/80 backdrop-blur-xl'

const itemBase = 'flex h-10 items-center gap-3 rounded-lg px-2.5 text-[15px]'

/**
 * Wide screens: the sidebar, always open, fixed along the left edge. Its
 * height comes from top and bottom alone: 100dvh would also count the strip
 * under a horizontal scrollbar, pushing the bottom out of sight.
 */
export function AppSidebar() {
  return (
    <aside className={cn('fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r lg:flex', surface)}>
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
        <SheetContent side="left" className="w-60 gap-0 border-white/8 bg-background p-0">
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
 * logging out at the bottom. A group gets its title only once it has two or
 * more pages. Unbuilt pages show as coming soon in development only.
 */
function SidebarContent({ onNavigate }: SidebarContentProps) {
  const groups = APP_NAV.map((group) => ({ ...group, items: group.items.filter((item) => isBuilt(item) || showComingSoon) })).filter(
    (group) => group.items.length > 0,
  )

  return (
    <>
      <div className="flex h-16 shrink-0 items-center gap-3 px-5">
        <img src={site.logoUrl} alt="" width={40} height={40} className="size-10" />
        <span className="font-heading text-xl text-foreground">{site.name}</span>
      </div>

      <nav aria-label="Főmenü" className="scrollbar-slim flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
        {groups.map((group) => (
          <div key={group.title} className={cn('flex flex-col gap-1', group.items.length >= 2 && 'mt-3')}>
            {group.items.length >= 2 && (
              <p id={`nav-${group.title}`} className="px-3 pb-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                {group.title}
              </p>
            )}
            <ul aria-labelledby={group.items.length >= 2 ? `nav-${group.title}` : undefined} className="flex flex-col gap-1">
              {group.items.map((item) => (
                <li key={item.label}>
                  {isBuilt(item) ? (
                    <NavLink
                      to={item.to}
                      end
                      onClick={(event) => {
                        blurAfterPointerClick(event)
                        onNavigate?.()
                      }}
                      className={({ isActive }) =>
                        cn(
                          itemBase,
                          'transition-colors',
                          focusRing,
                          isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
                        )
                      }
                    >
                      <FontAwesomeIcon icon={item.icon} className="size-5 shrink-0" aria-hidden="true" />
                      {item.label}
                    </NavLink>
                  ) : (
                    <span aria-disabled="true" className={cn(itemBase, 'cursor-not-allowed text-muted-foreground')}>
                      <span className="flex min-w-0 items-center gap-3 opacity-60">
                        <FontAwesomeIcon icon={item.icon} className="size-5 shrink-0" aria-hidden="true" />
                        <span className="min-w-0 truncate">{item.label}</span>
                      </span>
                      <span className="ml-auto shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[11px] leading-none uppercase">
                        Hamarosan
                      </span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <LogoutButton />
    </>
  )
}

/** Logging out, kept off the window's bottom edge: like a menu item, turning red on hover. */
function LogoutButton() {
  const logout = useLogout()

  return (
    <div className="shrink-0 border-t border-white/8 px-3 pt-2 pb-10">
      <button
        type="button"
        // Logged out: the guard sends the player to the login page.
        onClick={(event) => {
          blurAfterPointerClick(event)
          logout.mutate(undefined, { onError: (error) => toast.error(formMessage(error)) })
        }}
        disabled={logout.isPending}
        className={cn(
          itemBase,
          'w-full text-muted-foreground transition-colors hover:bg-redstone/10 hover:text-redstone disabled:opacity-60',
          focusRing,
        )}
      >
        <FontAwesomeIcon icon={faRightFromBracket} className="size-5 shrink-0" aria-hidden="true" />
        {logout.isPending ? 'Kijelentkezés…' : 'Kijelentkezés'}
      </button>
    </div>
  )
}
