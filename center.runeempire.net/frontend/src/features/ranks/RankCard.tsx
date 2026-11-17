import { faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import { rankColor } from '@/features/home/stats'
import { enterAfter } from '@/lib/motion'
import { cn } from '@/lib/utils'

import type { Rank } from './api'
import { seasonOver } from './dates'
import { BuyBox, NoLongerSold, OwnedUntil, RankBanner, SeasonInfo } from './RankParts'
import { RankPreview } from './RankPreview'
import { accentVars } from './shop'

type RankCardProps = {
  rank: Rank
  /** Some card of the page has a status line (season or owned): keep its place on this one too. */
  statusRow: boolean
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
 * One rank in the shop (owner, 2026-11-17), in its own colour (accentVars:
 * --c): a 3 px stripe on top, a faint border that lights up and lifts on
 * hover, the GIF on a tinted strip; then the name, right under it how it looks
 * on the player in game, "Tudj meg többet a rangról", and the BuyBox at the
 * bottom (lined up across a row). No level numbers and no "Legmagasabb rang"
 * (owner, 2026-11-17). The perks are in the rank text only.
 */
export function RankCard({
  rank,
  statusRow,
  ownedUntil,
  now,
  onDetails,
  onBuy,
  enterDelay,
}: RankCardProps) {
  const over = seasonOver(rank, now)

  return (
    <article
      className={cn(
        'content-in flex flex-col overflow-hidden rounded-2xl border border-[color:color-mix(in_oklab,var(--c)_35%,transparent)] bg-card shadow-[inset_0_1px_0_rgb(255_255_255/0.04),0_1px_2px_rgb(0_0_0/0.35)] transition-[border-color,translate,box-shadow] duration-200 hover:-translate-y-1 hover:border-(--c) hover:shadow-[0_12px_28px_-12px_var(--c)] motion-reduce:hover:translate-y-0',
        rank.seasonEndsAt && 'rank-shine',
      )}
      style={{ ...enterAfter(enterDelay), ...accentVars(rank.color) }}
    >
      <span aria-hidden="true" className="h-0.75 flex-none bg-(--c)" />
      {/* The GIF on a strip tinted with the rank colour. */}
      <div className="relative border-b border-border bg-[color:color-mix(in_oklab,var(--c)_12%,var(--background))] p-2">
        {rank.seasonEndsAt && (
          <span className="absolute top-2 left-2 z-1 inline-flex h-5.5 items-center rounded-full border border-primary/35 bg-primary/15 px-2.5 text-xs font-extrabold text-primary">
            Szezonális
          </span>
        )}
        <RankBanner rank={rank} className="min-h-0 border-b-0 bg-transparent p-0" />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:px-5">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2
            className="font-heading text-2xl leading-tight font-bold wrap-anywhere text-foreground"
            style={rankColor(rank.color)}
          >
            {rank.name}
          </h2>
          {(statusRow || rank.seasonEndsAt || ownedUntil) && (
            // The status line: the season and until when it is the player's. Every card keeps it
            // when any card has one, so a row's cards stay alike (review 2026-11-17: the others
            // got an empty hole above their buttons next to the owned rank).
            <div className="flex min-h-5 flex-col items-center gap-1">
              {rank.seasonEndsAt && <SeasonInfo endsAt={rank.seasonEndsAt} now={now} />}
              {ownedUntil && <OwnedUntil until={ownedUntil} />}
            </div>
          )}
        </div>

        <RankPreview rank={rank} />

        <button
          type="button"
          onClick={(event) => onDetails(event.currentTarget)}
          aria-label={`Tudj meg többet a rangról: ${rank.name}`}
          // The rank colour, lightened so a dark one still reads on the dark card.
          className="-my-1.5 min-h-11 self-center px-2 text-center text-[13px] font-bold text-[color:color-mix(in_oklab,var(--c)_60%,white)] hover:underline"
        >
          {/* On a narrow card it wraps before "rangról", never between the word and its arrow. */}
          Tudj meg többet a{' '}
          <span className="whitespace-nowrap">
            rangról
            <FontAwesomeIcon icon={faChevronRight} aria-hidden="true" className="ml-1.5 size-3" />
          </span>
        </button>

        <div className="mt-auto flex flex-col gap-3 border-t border-border pt-3">
          {over ? <NoLongerSold /> : <BuyBox rank={rank} owned={ownedUntil !== null} onBuy={onBuy} />}
        </div>
      </div>
    </article>
  )
}
