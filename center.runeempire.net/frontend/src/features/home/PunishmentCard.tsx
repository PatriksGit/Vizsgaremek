import { faGavel } from '@fortawesome/free-solid-svg-icons'
import { type CSSProperties, useRef, useState } from 'react'

import { panelLook } from '@/components/app/Panel'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import { StatIcon } from './StatCard'
import { NO_DATA, shortDate } from './stats'

/** The player's strongest active punishment, as the card shows it. */
export type Punishment = {
  kind: 'mute' | 'ban' | 'lock'
  /** ISO time it ends; null when it never does. Unused for a lock. */
  until: string | null
  issuedAt: string
  issuedBy: string
  reason: string
}

const KIND = {
  mute: { text: 'text-warn', title: 'Némítás', sr: 'Némítva eddig' },
  ban: { text: 'text-danger', title: 'Kitiltás', sr: 'Kitiltva eddig' },
  lock: { text: 'text-lock', title: 'Zárolás', sr: 'A fiók zárolva' },
} satisfies Record<Punishment['kind'], { text: string; title: string; sr: string }>

const dateTime = new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeStyle: 'short' })

type PunishmentCardProps = {
  /** undefined while it loads (a skeleton), null when the player has none. */
  punishment?: Punishment | null
  /** The punishments could not be loaded: a dash. */
  unavailable?: boolean
  /** "Büntetéseid" on the overview, "Büntetései" on another player's profile (wording.ts). */
  label: string
  className?: string
  style?: CSSProperties
}

/**
 * The punishment tile: "Nincsen" in green, or the end date of a mute (yellow)
 * or ban (red), or "Zárolva" with a red edge. Hovering, focusing or tapping the
 * value shows when it was given, by whom and why.
 */
export function PunishmentCard({ punishment, unavailable = false, label, className, style }: PunishmentCardProps) {
  const look = punishment && !unavailable ? KIND[punishment.kind] : null
  // Controlled, so a tap opens the details too: Base UI's preview card opens only on a mouse hover or a
  // keyboard focus, which a phone never sends (review 2026-11-17, UI-N1).
  const [detailsOpen, setDetailsOpen] = useState(false)
  // The pointer of the press that ends in the click; null for a click without one (Enter, Space).
  const pressedWith = useRef<string | null>(null)

  return (
    <li
      className={cn(
        panelLook,
        'flex min-h-21 items-center justify-between gap-3.5 px-4.5 py-4 md:min-h-29 md:px-6 md:py-5',
        punishment?.kind === 'lock' && 'border-lock/55',
        className,
      )}
      style={style}
    >
      <div className="flex min-w-0 flex-col gap-1.5 md:gap-2.5">
        <p className="text-sm font-bold text-soft md:text-base">{label}</p>
        {unavailable ? (
          <p className="text-2xl leading-none font-extrabold text-muted-foreground md:text-3xl">
            {NO_DATA}
            <span className="sr-only"> (most nem érhető el)</span>
          </p>
        ) : punishment === undefined ? (
          <>
            <Skeleton className="h-6 w-20 md:h-7.5" />
            <span className="sr-only">betöltés…</span>
          </>
        ) : punishment === null || look === null ? (
          <p className="text-2xl leading-none font-extrabold text-ok md:text-3xl">Nincsen</p>
        ) : (
          <HoverCard open={detailsOpen} onOpenChange={setDetailsOpen}>
            <HoverCardTrigger
              delay={100}
              render={
                <button
                  type="button"
                  onPointerDown={(event) => {
                    pressedWith.current = event.pointerType
                  }}
                  // A tap toggles the details; a mouse click keeps the card its hover opened, and a key opens it.
                  onClick={(event) => {
                    // The click's own pointer type where the browser gives one ('' for a key), else the press's.
                    const pointer = (event.nativeEvent as Partial<PointerEvent>).pointerType || pressedWith.current
                    const tap = pointer === 'touch' || pointer === 'pen'
                    pressedWith.current = null
                    setDetailsOpen((open) => (tap ? !open : true))
                  }}
                  className="cursor-help self-start rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                />
              }
            >
              <span
                className={cn(
                  'leading-none font-extrabold whitespace-nowrap',
                  look.text,
                  punishment.kind === 'lock' ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl',
                )}
              >
                {punishment.kind === 'lock' ? 'Zárolva' : punishment.until ? shortDate(punishment.until) : 'Végleges'}
              </span>
              <span className="sr-only"> ({look.sr})</span>
            </HoverCardTrigger>
            <HoverCardContent side="top" className="flex w-72 flex-col gap-2 rounded-[10px] border border-[#2f2a21] px-3.5 py-3 shadow-[0_12px_32px_rgb(0_0_0/0.55)] ring-0">
              <span className={cn('text-[13px] font-extrabold', look.text)}>{look.title}</span>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
                <dt className="text-faint">Kapta</dt>
                <dd className="text-foreground">{dateTime.format(new Date(punishment.issuedAt))}</dd>
                <dt className="text-faint">Kiosztotta</dt>
                <dd className="text-foreground">{punishment.issuedBy}</dd>
                <dt className="text-faint">Indok</dt>
                <dd className="text-foreground">{punishment.reason}</dd>
              </dl>
            </HoverCardContent>
          </HoverCard>
        )}
      </div>
      <StatIcon icon={faGavel} />
    </li>
  )
}
