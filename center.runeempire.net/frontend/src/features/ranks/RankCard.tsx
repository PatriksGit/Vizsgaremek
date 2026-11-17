import { faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'

import { rankColor } from '@/features/home/stats'
import { enterAfter } from '@/lib/motion'
import { cn } from '@/lib/utils'

import type { Rank } from './api'
import { seasonOver } from './dates'
import { DurationButtons, NoLongerSold, OwnedUntil, PriceTag, RankBanner, SeasonInfo } from './RankParts'
import { RankPreview } from './RankPreview'

type RankCardProps = {
  rank: Rank
  /** Until when the player has this rank; null when they don't. */
  ownedUntil: Date | null
  now: Date
  /** Opens the rank text ("Tudj meg többet a rangról"); gets its button, so focus can come back to it. */
  onDetails: (trigger: HTMLElement) => void
  /** Opens the purchase on this many days. */
  onBuy: (days: number) => void
  /** When it arrives in the page-load order (ms). */
  enterDelay: number
}

/**
 * One rank in the shop (owner, 2026-11-17): its banner, its name in the in-game
 * colour, right under it how it looks on the player in game, "Tudj meg többet
 * a rangról", then the price and one filled buy (or extend) button per
 * duration; the perks and the servers are in the rank text only.
 */
export function RankCard({ rank, ownedUntil, now, onDetails, onBuy, enterDelay }: RankCardProps) {
  const over = seasonOver(rank, now)
  // The duration whose button is under the pointer or focus: the price shows that one.
  const [previewDays, setPreviewDays] = useState<number | null>(null)

  return (
    <article
      className={cn(
        'content-in flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[inset_0_1px_0_rgb(255_255_255/0.04),0_1px_2px_rgb(0_0_0/0.35)] transition-colors hover:border-line',
        rank.seasonEndsAt && 'rank-shine',
      )}
      style={enterAfter(enterDelay)}
    >
      <div className="relative">
        {rank.seasonEndsAt && (
          <span className="absolute top-2.5 left-2.5 z-1 inline-flex h-5.5 items-center rounded-full border border-primary/35 bg-primary/15 px-2.5 text-xs font-extrabold text-primary">
            Szezonális
          </span>
        )}
        <RankBanner rank={rank} />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:px-5">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2
            className="font-heading text-2xl leading-tight font-bold wrap-anywhere text-foreground"
            style={rankColor(rank.color)}
          >
            {rank.name}
          </h2>
          {rank.seasonEndsAt && <SeasonInfo endsAt={rank.seasonEndsAt} now={now} />}
        </div>

        <RankPreview rank={rank} />

        <button
          type="button"
          onClick={(event) => onDetails(event.currentTarget)}
          aria-label={`Tudj meg többet a rangról: ${rank.name}`}
          className="-my-1.5 inline-flex min-h-11 items-center gap-1.5 self-center px-2 text-[13px] font-bold text-primary hover:text-primary/80"
        >
          Tudj meg többet a rangról
          <FontAwesomeIcon icon={faChevronRight} aria-hidden="true" className="size-3" />
        </button>

        {/* The price sits with the buttons at the bottom, so it lines up across a row of cards. */}
        <div className="mt-auto flex flex-col gap-3">
          <PriceTag rank={rank} days={previewDays} />
          <div className="flex flex-col gap-3 border-t border-border pt-3">
            {ownedUntil && <OwnedUntil until={ownedUntil} />}
            {over ? <NoLongerSold /> : <DurationButtons rank={rank} owned={ownedUntil !== null} onBuy={onBuy} onPreview={setPreviewDays} />}
          </div>
        </div>
      </div>
    </article>
  )
}
