import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { focusRing } from '@/components/app/interactive'
import { Panel } from '@/components/app/Panel'
import { site } from '@/config/site'
import { MANAGEMENT_NAV } from '@/features/app/nav'
import { enterAfter } from '@/lib/motion'
import { cn } from '@/lib/utils'

/**
 * One management tool's page (owner, 2026-11-26): the way back to the hub,
 * the tool's name, then the tool in its card.
 */
export function ToolPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <title>{`${title} | ${MANAGEMENT_NAV.label} | ${site.name}`}</title>
      {/* The profile's back link (PlayerProfilePage): the same look and 44 px on phones. */}
      <Link
        to={MANAGEMENT_NAV.to}
        className={cn(
          'content-in inline-flex items-center gap-2 self-start rounded-md text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground max-md:-my-3 max-md:min-h-11',
          focusRing,
        )}
        style={enterAfter(50)}
      >
        <FontAwesomeIcon icon={faArrowLeft} className="size-3.5" aria-hidden="true" />
        Vissza a Managementhez
      </Link>
      <h1 style={enterAfter(100)} className="content-in font-heading text-3xl font-bold text-foreground md:text-4xl">
        {title}
      </h1>
      <Panel style={enterAfter(200)} className="content-in">
        {children}
      </Panel>
    </>
  )
}
