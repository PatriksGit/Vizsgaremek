import { useState } from 'react'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { rankColor, runeCountFormat } from '@/features/home/stats'

import type { Rank } from './api'
import { seasonOver } from './dates'
import { Markdown } from './Markdown'
import { DurationButtons, NoLongerSold, OwnedUntil, PriceTag, RankBanner, SeasonInfo, ServerChips } from './RankParts'

type RankDetailsDialogProps = {
  /** The rank shown; null keeps the dialog shut. */
  rank: Rank | null
  /** Until when the player has it already, or null. */
  ownedUntil: Date | null
  /** The player's runes: undefined while loading, null when they cannot be read. */
  balance: number | null | undefined
  now: Date
  onClose: () => void
  /** Opens the purchase on this many days. */
  onBuy: (days: number) => void
}

/**
 * "Mit kapsz?": the banner and the name on top, the rank's Markdown text as one
 * scrolling document, and the duration buttons always in view at the bottom.
 * There is no product page behind it, so it repeats what the card says (the
 * rank colour, the season, the servers, until when it is the player's) and
 * shows the balance above the buttons (review 2026-11-17).
 */
export function RankDetailsDialog({ rank, ownedUntil, balance, now, onClose, onBuy }: RankDetailsDialogProps) {
  // The duration whose button is under the pointer or focus: the price shows that one.
  const [previewDays, setPreviewDays] = useState<number | null>(null)

  return (
    <Dialog open={rank !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[calc(100svh-2rem)] flex-col gap-0 overflow-hidden rounded-2xl border border-line bg-card p-0 ring-0 sm:max-w-160">
        {rank && (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <RankBanner rank={rank} />
              <div className="flex flex-col gap-4 p-6 pb-2">
                <div className="flex flex-col items-center gap-2 text-center">
                  <DialogTitle className="px-8 font-heading text-[28px] leading-tight font-bold" style={rankColor(rank.color)}>
                    {rank.name}
                  </DialogTitle>
                  {rank.seasonEndsAt && <SeasonInfo endsAt={rank.seasonEndsAt} now={now} />}
                  <ServerChips servers={rank.servers} />
                  {ownedUntil && <OwnedUntil until={ownedUntil} />}
                  <PriceTag rank={rank} days={previewDays} />
                </div>
                <Markdown>{rank.details}</Markdown>
              </div>
            </div>
            <div className="flex flex-col gap-2.5 border-t border-border p-4 sm:px-6">
              {typeof balance === 'number' && (
                <span className="text-center text-xs font-semibold text-muted-foreground">
                  Egyenleged: <strong className="text-foreground">{runeCountFormat.format(balance)} rúna</strong>
                </span>
              )}
              {seasonOver(rank, now) ? <NoLongerSold /> : <DurationButtons rank={rank} owned={ownedUntil !== null} onBuy={onBuy} onPreview={setPreviewDays} />}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
