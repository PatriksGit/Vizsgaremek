import { faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link } from 'react-router'

import { IconBadge } from '@/components/app/IconBadge'
import { Panel, panelLook } from '@/components/app/Panel'
import { Pill } from '@/components/app/Pill'
import { site } from '@/config/site'
import { blurAfterPointerClick } from '@/lib/focus'
import { cn } from '@/lib/utils'

import type { NavItem } from './nav'

/**
 * The landing page of a menu group (Rúnák): its pages as cards. On
 * phones the tab bar leads here, since it has no groups.
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
              <IconBadge icon={child.icon} />
              <span className="flex min-w-0 flex-1 flex-col">
                {/* "Hamarosan" by the title like in the sidebar, under it when narrow: beside the text it left a 35 px
                    column of one word per line (review 2026-11-24 SH-3). */}
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-heading text-xl text-foreground">{child.label}</span>
                  {child.comingSoon && (
                    <Pill tone="quiet" className="h-5 whitespace-nowrap">
                      Hamarosan
                    </Pill>
                  )}
                </span>
                {/* Balanced: the global text-wrap: pretty alone left "Hova mentek a" / "rúnáid" (review 2026-11-24 VI-8). */}
                {child.description && <span className="text-sm text-balance text-muted-foreground">{child.description}</span>}
              </span>
            </>
          )

          return (
            <li key={child.label}>
              {child.comingSoon ? (
                <Panel className="flex h-full items-center gap-4 opacity-60">{content}</Panel>
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
