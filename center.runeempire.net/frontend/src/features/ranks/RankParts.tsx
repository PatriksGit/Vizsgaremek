import { faCalendarDays, faCheck, faClock, faCoins, faImage } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import { runeCountFormat } from '@/features/home/stats'
import { cn } from '@/lib/utils'

import type { Rank } from './api'
import { budapestDay, seasonEndText, timeLeft } from './dates'

/** The rank's animated banner, 5:2 with a small inset; a dashed box until it has one. */
export function RankBanner({ rank, className }: { rank: Rank; className?: string }) {
  return (
    <div className={cn('flex aspect-5/2 items-center justify-center border-b border-border bg-background p-2', className)}>
      {rank.gifUrl ? (
        <img
          src={rank.gifUrl}
          alt={`${rank.name} rang animációja`}
          className="rank-reveal size-full object-contain"
        />
      ) : (
        <span className="flex size-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line text-faint">
          <FontAwesomeIcon icon={faImage} aria-hidden="true" className="size-5" />
          <span className="text-xs font-bold">A rang GIF-je ide kerül</span>
        </span>
      )}
    </div>
  )
}

const pad = (n: number) => String(n).padStart(2, '0')

const DAY_MS = 86_400_000

/**
 * Until when a seasonal rank sells: a fixed date ("Még vásárolható:
 * 2026.12.26-ig"), a ticking countdown only in its last 24 hours, then that it
 * is over. Not a long ticking timer: the players are 13-17, and false urgency
 * is what the Dutch ACM fined Epic for (owner, 2026-11-17).
 */
export function SeasonInfo({ endsAt, now }: { endsAt: string; now: Date }) {
  const left = new Date(endsAt).getTime() - now.getTime()

  if (left <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted-foreground">
        <FontAwesomeIcon icon={faClock} aria-hidden="true" className="size-3.5" />
        A vásárlási idő lejárt
      </span>
    )
  }

  if (left <= DAY_MS) {
    const { hours, minutes, seconds } = timeLeft(left)
    return (
      <span
        role="timer"
        aria-label={`Még ${hours} óra ${minutes} perc vásárolható`}
        className="inline-flex items-center gap-1.5 text-[13px] font-bold text-primary"
      >
        <FontAwesomeIcon icon={faClock} aria-hidden="true" className="size-3.5" />
        Még {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-primary">
      <FontAwesomeIcon icon={faCalendarDays} aria-hidden="true" className="size-3.5" />
      Még vásárolható: {seasonEndText(endsAt)}
    </span>
  )
}

/**
 * The price above the duration buttons, always "N rúna" (owner, 2026-11-17):
 * the shortest duration's, or the one whose button is under the pointer or
 * focus. The buttons carry no price; the popup names the exact one too.
 */
export function PriceTag({ rank, days }: { rank: Rank; days: number | null }) {
  const shown = rank.prices.find((option) => option.days === days) ?? [...rank.prices].sort((a, b) => a.days - b.days)[0]
  if (!shown) return null
  return (
    <p className="flex items-center justify-center gap-1.5 text-lg font-extrabold text-foreground tabular-nums">
      <FontAwesomeIcon icon={faCoins} aria-hidden="true" className="size-4 text-primary" />
      {runeCountFormat.format(shown.runes)} rúna
    </p>
  )
}

/**
 * One filled button per duration, without a price (owner, 2026-11-17: "30 nap"
 * and "90 nap"; the PriceTag above follows the one under the pointer or
 * focus, and the popup names it too). A darker gold that lights up on hover
 * (owner, 2026-11-17); equal weight on purpose: the dearer one is not pushed.
 * A player who has the rank sees "+30 nap" (extending).
 */
export function DurationButtons({
  rank,
  owned,
  onBuy,
  onPreview,
  className,
}: {
  rank: Rank
  owned: boolean
  onBuy: (days: number) => void
  /** The duration under the pointer or focus, null when none; for the PriceTag. */
  onPreview?: (days: number | null) => void
  className?: string
}) {
  return (
    <div className={cn('grid gap-2', rank.prices.length > 1 ? 'grid-cols-2' : 'grid-cols-1', className)}>
      {rank.prices.map(({ days }) => (
        <button
          key={days}
          type="button"
          onClick={() => onBuy(days)}
          onPointerEnter={() => onPreview?.(days)}
          onPointerLeave={() => onPreview?.(null)}
          onFocus={() => onPreview?.(days)}
          onBlur={() => onPreview?.(null)}
          className="flex min-h-12 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--primary)_76%,black)] px-2 text-[15px] font-extrabold text-primary-foreground transition-[background-color,translate] hover:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:translate-y-px"
        >
          {/* The rank in the name too: ten "30 nap" buttons must not sound alike to a screen reader. */}
          <span className="sr-only">{`${rank.name} ${owned ? 'meghosszabbítása' : 'megvásárlása'}: `}</span>
          {owned ? '+' : ''}
          {days} nap
        </button>
      ))}
    </div>
  )
}

/** The servers a rank gives something on, as small chips; nothing when none. */
export function ServerChips({ servers }: { servers: string[] }) {
  if (servers.length === 0) return null
  return (
    <ul aria-label="Szerverek" className="flex flex-wrap justify-center gap-1.5">
      {servers.map((server) => (
        <li key={server} className="rounded-md border border-line bg-raised px-2 py-0.5 text-xs font-bold text-soft">
          {server}
        </li>
      ))}
    </ul>
  )
}

/** Until when the player has this rank, in green; on the card and in "Mit kapsz?". */
export function OwnedUntil({ until }: { until: Date }) {
  return (
    <span className="flex items-center justify-center gap-1.5 text-sm font-bold text-ok">
      <FontAwesomeIcon icon={faCheck} aria-hidden="true" className="size-3.5" />
      Aktív eddig: {budapestDay(until)}
    </span>
  )
}

/** In place of the buy button once a seasonal rank's time is over. */
export function NoLongerSold({ className }: { className?: string }) {
  return (
    <span
      aria-disabled="true"
      className={cn(
        'flex min-h-12 w-full items-center justify-center rounded-xl border border-line bg-sunken text-[15px] font-bold text-faint',
        className,
      )}
    >
      Már nem vásárolható
    </span>
  )
}
