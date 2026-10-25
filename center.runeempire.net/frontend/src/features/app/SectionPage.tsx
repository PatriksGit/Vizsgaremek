import { faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link } from 'react-router'

import { IconBadge } from '@/components/app/IconBadge'
import { Panel, panelLook } from '@/components/app/Panel'
import { site } from '@/config/site'
import { blurAfterPointerClick } from '@/lib/focus'
import { cn } from '@/lib/utils'

import type { NavItem } from './nav'

/**
 * The landing page of a menu item with a dropdown (Bolt, Közösség): its pages
 * as cards. On phones the tab bar leads here, since it has no dropdowns.
 */
export function SectionPage({ item }: { item: NavItem }) {
  return (
    <section className="flex flex-col gap-5">
      <title>{`${item.label} | ${site.name}`}</title>
      <h1 className="font-heading text-4xl text-foreground">{item.label}</h1>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {item.children?.map((child) => {
          const content = (
            <>
              <IconBadge icon={child.icon} tone="gold" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-heading text-xl text-foreground">{child.label}</span>
                {child.description && <span className="text-sm text-muted-foreground">{child.description}</span>}
              </span>
            </>
          )

          return (
            <li key={child.label}>
              {child.comingSoon ? (
                <Panel className="flex items-center gap-4 opacity-60">
                  {content}
                  <span className="text-xs text-muted-foreground">Hamarosan</span>
                </Panel>
              ) : (
                <Link
                  to={child.to}
                  onClick={blurAfterPointerClick}
                  className={cn(
                    panelLook,
                    'group flex h-full items-center gap-4 transition-colors hover:border-primary/30',
                    'outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                  )}
                >
                  {content}
                  <FontAwesomeIcon
                    icon={faChevronRight}
                    className="size-3.5 text-muted-foreground transition-colors group-hover:text-primary"
                    aria-hidden="true"
                  />
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
