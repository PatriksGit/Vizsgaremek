import { faCalendarDays, faCheck, faClock, faCoins, faHourglassEnd } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import { useId, useState } from 'react'

import { Pill } from '@/components/app/Pill'
import { budapestDay, countFormat, DAY_MS } from '@/lib/budapest'
import { cn } from '@/lib/utils'

import type { Rank } from './api'
import { seasonEndText, timeLeft } from './dates'
import { discountPercent } from './shop'

/**
 * The rank's animated banner, 5:2 with a small inset. Without a GIF the strip stays, empty (its tint only), so the
 * cards keep their shape: no "the GIF goes here" placeholder for players (review 2026-11-23, ranks-players K3).
 */
export function RankBanner({ rank, className }: { rank: Rank; className?: string }) {
  return (
    <div className={cn('flex aspect-5/2 items-center justify-center', className)}>
      {rank.gifUrl && (
        <img src={rank.gifUrl} alt={`${rank.name} rang animációja`} className="rank-reveal size-full object-contain" />
      )}
    </div>
  )
}

const pad = (n: number) => String(n).padStart(2, '0')

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
        <FontAwesomeIcon icon={faHourglassEnd} aria-hidden="true" className="size-3.5" />A vásárlási idő lejárt
      </span>
    )
  }

  if (left < DAY_MS) {
    const { hours, minutes, seconds } = timeLeft(left)
    return (
      <span
        role="timer"
        // The last minute in seconds: "0 óra 0 perc" would say nothing is left (like R2 at exactly 24 hours).
        aria-label={`Még ${hours + minutes > 0 ? `${hours} óra ${minutes} perc` : `${seconds} másodperc`} vásárolható`}
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
 * How a rank is bought (owner, 2026-11-17): a 30 nap / 90 nap switch (radio
 * buttons, so arrow keys work), the chosen duration's price ("N rúna"), a
 * small real-discount badge on a longer duration (computed from the prices),
 * then one full-width "Megveszem" ("Meghosszabbítom" when owned) in the rank
 * colour (--c / --on-c from accentVars on an ancestor). The shortest duration
 * is chosen first; nothing is pushed.
 */
export function BuyBox({ rank, owned, onBuy }: { rank: Rank; owned: boolean; onBuy: (days: number) => void }) {
  const options = rank.prices // shortest first (api.ts)
  const [days, setDays] = useState(options[0]?.days ?? 0)
  const name = useId()
  const chosen = options.find((option) => option.days === days) ?? options[0]
  if (!chosen) return null
  const verb = owned ? 'Meghosszabbítom' : 'Megveszem'

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="min-w-0">
        <legend className="sr-only">Időtartam</legend>
        <div
          className={cn(
            'grid gap-1 rounded-xl border border-line bg-sunken p-1',
            options.length > 1 ? 'grid-cols-2' : 'grid-cols-1',
          )}
        >
          {options.map((option) => {
            const off = discountPercent(rank.prices, option.days)
            return (
              <label
                key={option.days}
                className="relative flex min-h-10 cursor-pointer items-center justify-center rounded-lg text-sm font-extrabold text-soft transition-colors select-none hover:text-foreground has-checked:bg-(--c) has-checked:text-(--on-c) has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-(--c) max-md:min-h-11"
              >
                <input
                  type="radio"
                  name={name}
                  value={option.days}
                  checked={option.days === chosen.days}
                  onChange={() => setDays(option.days)}
                  className="sr-only"
                />
                {owned ? '+' : ''}
                {option.days} nap
                {off > 0 && (
                  <Pill className="absolute -top-2 -right-1 bg-ok px-1.5 py-px text-[10px] leading-tight font-extrabold text-background">
                    {` -${off}%`}
                    <span className="sr-only"> kedvezmény</span>
                  </Pill>
                )}
              </label>
            )
          })}
        </div>
      </fieldset>

      <p className="flex items-center justify-center gap-1.5 text-xl font-extrabold text-foreground tabular-nums">
        <FontAwesomeIcon icon={faCoins} aria-hidden="true" className="size-4 text-primary" />
        {countFormat.format(chosen.runes)} rúna
      </p>

      <button
        type="button"
        onClick={() => onBuy(chosen.days)}
        // Which rank and how long, for a screen reader: ten "Megveszem" buttons must not sound alike.
        // It starts with the visible text, so a voice command "Megveszem" still finds it.
        aria-label={`${verb}: ${rank.name}, ${chosen.days} nap`}
        className="min-h-12 w-full rounded-xl bg-(--c) px-3 text-[15px] font-extrabold text-(--on-c) transition-[filter,translate] hover:brightness-115 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c) active:translate-y-px motion-reduce:active:translate-y-0"
      >
        {verb}
      </button>
    </div>
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
export function NoLongerSold() {
  return (
    // No aria-disabled: on a span (no role) it means nothing to a screen reader; the text says it (review 2026-11-24 RK-K4).
    <span className="flex min-h-12 w-full items-center justify-center rounded-xl border border-line bg-sunken text-[15px] font-bold text-faint">
      Már nem vásárolható
    </span>
  )
}
