import { Link } from 'react-router'

import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { runeCountFormat } from '@/features/home/stats'

import type { Rank } from './api'
import { addDays, budapestDay, seasonOver } from './dates'
import { NoLongerSold } from './RankParts'

type PurchaseDialogProps = {
  /** The rank being bought; null keeps the dialog shut. */
  rank: Rank | null
  /** The duration whose button was pressed. */
  days: number
  /** Until when the player has it already (extending), or null (buying). */
  ownedUntil: Date | null
  /** The player's runes: undefined while loading, null when they cannot be read. */
  balance: number | null | undefined
  now: Date
  onClose: () => void
}

/**
 * One plain confirmation before a purchase (owner, 2026-11-17): the rank, the
 * duration and the price, until when it will last, and that it cannot be
 * undone. Not enough runes says how many are missing and offers topping up;
 * a seasonal rank whose time ran out while it was open can no longer be
 * bought. Buying is not wired yet (frontend only), so the confirm button is
 * off and says so.
 */
export function PurchaseDialog({ rank, days, ownedUntil, balance, now, onClose }: PurchaseDialogProps) {
  const price = rank?.prices.find((option) => option.days === days)?.runes ?? 0
  const extending = ownedUntil !== null
  const missing = typeof balance === 'number' ? price - balance : 0

  return (
    <Dialog open={rank !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-5 rounded-2xl border border-line bg-card p-6 ring-0 sm:max-w-105">
        {rank && (
          <>
            <div className="flex flex-col gap-3 pr-8">
              <DialogTitle className="font-heading text-2xl leading-tight font-bold">
                {extending ? 'Biztosan meghosszabbítod?' : 'Biztosan megveszed?'}
              </DialogTitle>
              <DialogDescription render={<div />} className="flex flex-col gap-1 text-sm text-muted-foreground">
                <span className="text-base font-bold text-foreground">
                  {`${rank.name} · ${days} nap · ${runeCountFormat.format(price)} rúna`}
                </span>
                <span>
                  {extending ? 'Új lejárat' : 'Aktív eddig'}:{' '}
                  <strong className="text-foreground">{budapestDay(addDays(ownedUntil ?? now, days))}</strong>
                </span>
                <span className="mt-2 font-semibold text-soft">A vásárlás nem visszavonható.</span>
              </DialogDescription>
            </div>

            {seasonOver(rank, now) ? (
              <NoLongerSold />
            ) : missing > 0 ? (
              <div className="flex flex-col gap-2.5">
                <span className="text-sm font-semibold text-danger">
                  Nincs elég rúnád, még {runeCountFormat.format(missing)} hiányzik.
                </span>
                <Link
                  to="/runak/vasarlas"
                  className="flex min-h-12 items-center justify-center rounded-full bg-primary text-[15px] font-extrabold text-primary-foreground transition-colors hover:bg-primary/85"
                >
                  Rúna-feltöltés
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {/* Buying is not wired yet (frontend only): the button shows where it will be. */}
                <button
                  type="button"
                  disabled
                  className="min-h-12 rounded-full bg-primary text-[15px] font-extrabold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {extending ? 'Igen, meghosszabbítom' : 'Igen, megveszem'}
                </button>
                <span className="text-center text-xs font-semibold text-faint">A vásárlás hamarosan indul.</span>
              </div>
            )}

            <DialogClose className="min-h-11 self-center px-4 text-[13px] font-bold text-muted-foreground hover:text-foreground">
              Mégse
            </DialogClose>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
