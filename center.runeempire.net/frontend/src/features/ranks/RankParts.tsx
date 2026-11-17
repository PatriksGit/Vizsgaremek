import { faCalendarDays, faClock, faCoins, faImage } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import { runeCountFormat } from '@/features/home/stats'
import { cn } from '@/lib/utils'

import type { Rank } from './api'
import { seasonEndText, timeLeft } from './dates'

/** The rank's animated banner, 2:1 with a small inset; a dashed box until it has one. */
export function RankBanner({ rank, className, decorative = false }: { rank: Rank; className?: string; decorative?: boolean }) {
  return (
    <div className={cn('flex aspect-2/1 items-center justify-center border-b border-border bg-background p-2', className)}>
      {rank.gifUrl ? (
        <img
          src={rank.gifUrl}
          alt={decorative ? '' : `${rank.name} rang animációja`}
          aria-hidden={decorative || undefined}
          className="size-full object-contain"
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
      <span className="inline-flex items-center gap-1.5 self-start text-[13px] font-bold text-muted-foreground">
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
        className="inline-flex items-center gap-1.5 self-start text-[13px] font-bold text-primary"
      >
        <FontAwesomeIcon icon={faClock} aria-hidden="true" className="size-3.5" />
        Még {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 self-start text-[13px] font-bold text-primary">
      <FontAwesomeIcon icon={faCalendarDays} aria-hidden="true" className="size-3.5" />
      Még vásárolható: {seasonEndText(endsAt)}
    </span>
  )
}

/**
 * One button per duration, its price on it (owner, 2026-11-17: "30 nap" and
 * "90 nap" instead of one buy button). Equal weight on purpose: the dearer one
 * is not pushed. A player who has the rank sees "+30 nap" (extending).
 */
export function DurationButtons({
  rank,
  owned,
  onBuy,
  className,
}: {
  rank: Rank
  owned: boolean
  onBuy: (days: number) => void
  className?: string
}) {
  return (
    <div className={cn('grid gap-2', rank.prices.length > 1 ? 'grid-cols-2' : 'grid-cols-1', className)}>
      {rank.prices.map(({ days, runes }) => (
        <button
          key={days}
          type="button"
          onClick={() => onBuy(days)}
          className="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl border border-primary/40 bg-primary/12 px-2 py-2 text-foreground transition-colors hover:border-primary/70 hover:bg-primary/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span className="sr-only">{owned ? 'Meghosszabbítás: ' : 'Megvásárlás: '}</span>
          <span className="text-[15px] leading-tight font-extrabold">
            {owned ? '+' : ''}
            {days} nap
          </span>
          <span className="flex items-center gap-1 text-xs font-bold text-soft">
            <FontAwesomeIcon icon={faCoins} aria-hidden="true" className="size-3 text-primary" />
            {runeCountFormat.format(runes)} rúna
          </span>
        </button>
      ))}
    </div>
  )
}

/** In place of the buy button once a seasonal rank's time is over. */
export function NoLongerSold({ className }: { className?: string }) {
  return (
    <span
      aria-disabled="true"
      className={cn(
        'flex min-h-14 w-full items-center justify-center rounded-xl border border-line bg-sunken text-[15px] font-bold text-faint',
        className,
      )}
    >
      Már nem vásárolható
    </span>
  )
}
