import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

import type { Rank } from './api'
import { seasonOver } from './dates'
import { Markdown } from './Markdown'
import { DurationButtons, NoLongerSold, RankBanner } from './RankParts'

type RankDetailsDialogProps = {
  /** The rank shown; null keeps the dialog shut. */
  rank: Rank | null
  owned: boolean
  now: Date
  onClose: () => void
  /** Opens the purchase on this many days. */
  onBuy: (days: number) => void
}

/**
 * "Mit kapsz?": the banner and the name on top, the rank's Markdown text as one
 * scrolling document, and the duration buttons always in view at the bottom.
 */
export function RankDetailsDialog({ rank, owned, now, onClose, onBuy }: RankDetailsDialogProps) {
  return (
    <Dialog open={rank !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[calc(100svh-2rem)] flex-col gap-0 overflow-hidden rounded-2xl border border-line bg-card p-0 ring-0 sm:max-w-160">
        {rank && (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <RankBanner rank={rank} />
              <div className="flex flex-col gap-4 p-6 pb-2">
                <DialogTitle className="pr-10 font-heading text-[28px] leading-tight font-bold">{rank.name}</DialogTitle>
                <Markdown>{rank.details}</Markdown>
              </div>
            </div>
            <div className="border-t border-border p-4 sm:px-6">
              {seasonOver(rank, now) ? <NoLongerSold /> : <DurationButtons rank={rank} owned={owned} onBuy={onBuy} />}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
