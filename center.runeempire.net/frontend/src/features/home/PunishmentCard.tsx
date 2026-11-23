import { faGavel } from '@fortawesome/free-solid-svg-icons'
import { type CSSProperties, useRef, useState } from 'react'

import { focusRing } from '@/components/app/interactive'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { budapestDayAndTime } from '@/lib/budapest'
import { cn } from '@/lib/utils'

import { StatCard } from './StatCard'
import { dateOrDash, shortDate } from './stats'

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
    <StatCard
      label={label}
      icon={faGavel}
      className={cn(punishment?.kind === 'lock' && 'border-lock/55', className)}
      style={style}
      value={
        unavailable ? null : punishment === undefined ? undefined : punishment === null || look === null ? (
          <span className="text-ok">Nincsen</span>
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
                  className={cn('cursor-help self-start rounded-sm text-left max-md:-my-3 max-md:min-h-11', focusRing)}
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
                {/* On the Budapest clock like its end day and the game (H4). */}
                <dd className="text-foreground">{dateOrDash(punishment.issuedAt, budapestDayAndTime)}</dd>
                <dt className="text-faint">Kiosztotta</dt>
                <dd className="text-foreground">{punishment.issuedBy}</dd>
                <dt className="text-faint">Indok</dt>
                <dd className="text-foreground">{punishment.reason}</dd>
              </dl>
            </HoverCardContent>
          </HoverCard>
        )
      }
    />
  )
}
