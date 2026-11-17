import { faCheck, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import { rankColor } from '@/features/home/stats'
import { cn } from '@/lib/utils'

import type { Rank } from './api'
import { budapestDay, seasonOver } from './dates'
import { highlights } from './markdownBlocks'
import { DurationButtons, NoLongerSold, RankBanner, SeasonInfo } from './RankParts'
import { RankPreview } from './RankPreview'

type RankCardProps = {
  rank: Rank
  /** Until when the player has this rank; null when they don't. */
  ownedUntil: Date | null
  now: Date
  onDetails: () => void
  /** Opens the purchase on this many days. */
  onBuy: (days: number) => void
}

/**
 * One rank in the shop: its banner, its name in the in-game colour, its first
 * three perks, how it looks on the player, and one buy (or extend) button per
 * duration; the whole text is in "Mit kapsz?".
 */
export function RankCard({ rank, ownedUntil, now, onDetails, onBuy }: RankCardProps) {
  const over = seasonOver(rank, now)
  const perks = highlights(rank.details, 3)

  return (
    <article
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[inset_0_1px_0_rgb(255_255_255/0.04),0_1px_2px_rgb(0_0_0/0.35)] transition-colors hover:border-line',
        rank.seasonEndsAt && 'rank-shine',
      )}
    >
      <div className="relative">
        {rank.seasonEndsAt && (
          <span className="absolute top-2.5 left-2.5 z-1 inline-flex h-5.5 items-center rounded-full border border-primary/35 bg-primary/15 px-2.5 text-xs font-extrabold text-primary">
            Szezonális
          </span>
        )}
        <RankBanner rank={rank} />
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5 sm:px-6 sm:pb-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h3
            className="font-heading text-2xl leading-tight font-bold wrap-anywhere text-foreground"
            style={rankColor(rank.color)}
          >
            {rank.name}
          </h3>
          {rank.seasonEndsAt && <SeasonInfo endsAt={rank.seasonEndsAt} now={now} />}
        </div>

        {perks.length > 0 && (
          <ul aria-label="Fő előnyök" className="flex flex-col gap-1.5 self-center text-sm text-soft">
            {perks.map((perk) => (
              <li key={perk} className="flex items-start gap-2">
                <FontAwesomeIcon icon={faCheck} aria-hidden="true" className="mt-1 size-3 flex-none text-primary" />
                {perk}
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={onDetails}
          className="inline-flex min-h-11 items-center gap-1.5 self-center px-2 text-[13px] font-bold text-primary hover:text-primary/80"
        >
          Mit kapsz?
          <FontAwesomeIcon icon={faChevronRight} aria-hidden="true" className="size-3" />
        </button>

        <RankPreview rank={rank} />

        <div className="mt-auto flex flex-col gap-3 border-t border-border pt-3.5">
          {ownedUntil && (
            <span className="flex items-center justify-center gap-1.5 text-sm font-bold text-ok">
              <FontAwesomeIcon icon={faCheck} aria-hidden="true" className="size-3.5" />
              Aktív eddig: {budapestDay(ownedUntil)}
            </span>
          )}
          {over ? <NoLongerSold /> : <DurationButtons rank={rank} owned={ownedUntil !== null} onBuy={onBuy} />}
        </div>
      </div>
    </article>
  )
}
