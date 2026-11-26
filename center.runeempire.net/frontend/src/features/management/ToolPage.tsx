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
 * One management tool's page (owner, 2026-11-26): on phones the way back to
 * the hub, then a small "Management" kicker, the tool's name, and the tool in
 * its card.
 */
export function ToolPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <title>{`${title} | ${MANAGEMENT_NAV.label} | ${site.name}`}</title>
      {/*
       * Phones only (owner, 2026-11-26): on desktop the sidebar's Management group navigates; phones have no
       * sidebar and reach the tools through the hub. The profile's back link look, 44 px.
       */}
      <Link
        to={MANAGEMENT_NAV.to}
        className={cn(
          'content-in inline-flex items-center gap-2 self-start rounded-md text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground max-md:-my-3 max-md:min-h-11 md:hidden',
          focusRing,
        )}
        style={enterAfter(50)}
      >
        <FontAwesomeIcon icon={faArrowLeft} className="size-3.5" aria-hidden="true" />
        Vissza a Managementhez
      </Link>
      {/* The kicker says where the page belongs: the sidebar has two "Napló"s (Rúnák and Management). */}
      <div style={enterAfter(100)} className="content-in flex flex-col gap-1">
        <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">{MANAGEMENT_NAV.label}</p>
        <h1 className="font-heading text-3xl font-bold text-foreground md:text-4xl">{title}</h1>
      </div>
      <Panel style={enterAfter(200)} className="content-in">
        {children}
      </Panel>
    </>
  )
}
