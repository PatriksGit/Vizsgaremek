import { useId } from 'react'
import { Link } from 'react-router'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
  /** Where focus goes when it closes (true: back to what opened it). */
  finalFocus?: () => HTMLElement | true
}

/**
 * One plain confirmation before a purchase (owner, 2026-11-17): the rank, the
 * duration and the price, until when it will last, and that it cannot be
 * undone. Mégse first, in red, then the action's own name in green (owner,
 * 2026-11-17). Not enough runes says how many are missing and offers topping
 * up instead; a seasonal rank whose time ran out while it was open can no
 * longer be bought. Buying is not wired yet (frontend only), so the purchase
 * button is off and says so.
 *
 * A shadcn AlertDialog (owner, 2026-11-17): a decision, so it has no X and a
 * stray tap beside it does not close it; only Mégse or Esc do.
 */
export function PurchaseDialog({ rank, days, ownedUntil, balance, now, onClose, finalFocus }: PurchaseDialogProps) {
  const price = rank?.prices.find((option) => option.days === days)?.runes ?? 0
  const extending = ownedUntil !== null
  const missing = typeof balance === 'number' ? price - balance : 0
  const over = rank !== null && seasonOver(rank, now)
  const buyable = !over && missing <= 0
  const hintId = useId()

  return (
    <AlertDialog open={rank !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent
        finalFocus={finalFocus}
        className="max-h-[calc(100svh-2rem)] gap-5 overflow-y-auto rounded-2xl border border-line bg-card p-6 ring-0 data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-105"
      >
        {rank && (
          <>
            <div className="flex flex-col gap-3">
              <AlertDialogTitle className="font-heading text-2xl leading-tight font-bold">
                {extending ? 'Biztosan meghosszabbítod?' : 'Biztosan megveszed?'}
              </AlertDialogTitle>
              <AlertDialogDescription render={<div />} className="flex flex-col gap-1 text-sm text-pretty text-muted-foreground">
                <span className="text-base font-bold text-foreground">
                  {`${rank.name} · ${days} nap · ${runeCountFormat.format(price)} rúna`}
                </span>
                <span>
                  {extending ? 'Új lejárat' : 'Aktív eddig'}:{' '}
                  <strong className="text-foreground">{budapestDay(addDays(ownedUntil ?? now, days))}</strong>
                </span>
                {typeof balance === 'number' && (
                  // Before and after, so the player sees what is left (Roblox does this); only the balance when it is short.
                  <span>
                    Egyenleged:{' '}
                    <strong className="text-foreground">
                      {runeCountFormat.format(balance)}
                      {buyable && ` → ${runeCountFormat.format(balance - price)}`} rúna
                    </strong>
                  </span>
                )}
                {/* Nothing can be bought when the runes are short or the season is over: nothing to warn about. */}
                {buyable && <span className="mt-2 font-semibold text-soft">A vásárlás nem visszavonható.</span>}
              </AlertDialogDescription>
            </div>

            {!over && missing > 0 && (
              <span className="text-sm font-semibold text-danger">
                Nincs elég rúnád, még {runeCountFormat.format(missing)} hiányzik.
              </span>
            )}

            <div className="flex flex-col gap-1.5">
              <div className="grid grid-cols-2 gap-3">
                <AlertDialogCancel
                  variant="ghost"
                  className="h-auto min-h-12 rounded-full border border-danger/70 text-[15px] font-extrabold text-danger hover:bg-danger/10 hover:text-danger"
                >
                  Mégse
                </AlertDialogCancel>
                {over ? (
                  <NoLongerSold className="min-h-12 rounded-full text-sm" />
                ) : missing > 0 ? (
                  <Link
                    to="/runak/vasarlas"
                    className="flex min-h-12 items-center justify-center rounded-full bg-primary text-[15px] font-extrabold text-primary-foreground transition-colors hover:bg-primary/85"
                  >
                    Rúna-feltöltés
                  </Link>
                ) : (
                  // Buying is not wired yet (frontend only): the button shows where it will be.
                  <button
                    type="button"
                    disabled
                    aria-describedby={hintId}
                    className="min-h-12 rounded-full bg-ok text-[15px] font-extrabold text-background disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {extending ? 'Meghosszabbítás' : 'Megvásárlás'}
                  </button>
                )}
              </div>
              {buyable && (
                <span id={hintId} className="text-center text-xs font-semibold text-faint">
                  A vásárlás hamarosan indul.
                </span>
              )}
            </div>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
