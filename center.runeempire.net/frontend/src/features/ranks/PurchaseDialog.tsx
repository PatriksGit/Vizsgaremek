import { faCoins } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'
import { Link } from 'react-router'

import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { NO_DATA, runeCountFormat } from '@/features/home/stats'
import { cn } from '@/lib/utils'

import { addDays, budapestDay } from './dates'
import { RankBanner } from './RankParts'
import { DURATIONS, type Duration, type Rank } from './ranks'

type PurchaseDialogProps = {
  /** The rank being bought; null keeps the dialog shut. */
  rank: Rank | null
  /** Until when the player has it already (extending), or null (buying). */
  ownedUntil: Date | null
  /** The player's runes: undefined while loading, null when they cannot be read. */
  balance: number | null | undefined
  now: Date
  onClose: () => void
}

const runes = (amount: number) => `${runeCountFormat.format(amount)} rúna`

/**
 * Buying or extending a rank: 30 or 90 days, the price, the balance and the
 * new expiry. Buying is not wired yet (frontend only), so the final button is
 * off; not enough runes offers topping up instead.
 */
export function PurchaseDialog({ rank, ownedUntil, balance, now, onClose }: PurchaseDialogProps) {
  return (
    <Dialog open={rank !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] gap-0 overflow-y-auto rounded-2xl border border-line bg-card p-0 ring-0 sm:max-w-115">
        {/* Keyed by rank: a new purchase starts at 30 days. */}
        {rank && <PurchaseForm key={rank.id} rank={rank} ownedUntil={ownedUntil} balance={balance} now={now} />}
      </DialogContent>
    </Dialog>
  )
}

function PurchaseForm({ rank, ownedUntil, balance, now }: Omit<PurchaseDialogProps, 'rank' | 'onClose'> & { rank: Rank }) {
  const [duration, setDuration] = useState<Duration>(30)
  const extending = ownedUntil !== null
  const price = rank.prices[duration]
  const short = typeof balance === 'number' && balance < price

  return (
    <div className="flex flex-col gap-5 p-6">
      <RankBanner rank={rank} decorative className="-mx-6 -mt-6 aspect-auto h-24 px-16" />

      <div className="flex flex-col gap-1 pr-10">
        <span className="text-xs font-bold tracking-widest text-faint uppercase">{extending ? 'Meghosszabbítás' : 'Vásárlás'}</span>
        <DialogTitle className="font-heading text-[26px] leading-tight font-bold">{rank.name}</DialogTitle>
        <span className="text-sm text-muted-foreground">Mennyi időre szeretnéd?</span>
      </div>

      <div role="radiogroup" aria-label="Időtartam" className="grid grid-cols-2 gap-3">
        {DURATIONS.map((days) => {
          const active = days === duration
          return (
            <button
              key={days}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setDuration(days)}
              className={cn(
                // The selected edge is a ring on top of the 1 px border, so the text does not shift.
                'relative flex flex-col items-start gap-1.5 rounded-2xl border p-4 text-left text-foreground transition-colors',
                active ? 'border-primary bg-primary/8 ring-1 ring-primary' : 'border-line bg-sunken hover:border-faint',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-3.5 right-3.5 size-4.5 rounded-full',
                  active ? 'border-5 border-primary bg-primary-foreground' : 'border-2 border-faint',
                )}
              />
              <span className="text-xl font-extrabold">{days} nap</span>
              <span className="flex items-center gap-1.5 text-sm font-bold text-soft">
                <FontAwesomeIcon icon={faCoins} aria-hidden="true" className="size-3.5 text-primary" />
                {runes(rank.prices[days])}
              </span>
              <span className="text-xs font-semibold text-faint">≈ {runeCountFormat.format(Math.round(rank.prices[days] / days))} rúna / nap</span>
              {days === 90 && (
                <span className="inline-flex h-5 items-center rounded-full bg-ok/14 px-2 text-xs font-extrabold text-ok">Kedvezőbb</span>
              )}
            </button>
          )
        })}
      </div>

      <dl className="flex flex-col gap-2 rounded-xl border border-border bg-background px-4 py-3.5 text-[13px]">
        <div className="flex justify-between gap-3 text-muted-foreground">
          <dt>Egyenleged</dt>
          <dd className="font-bold text-foreground">
            {balance === undefined ? (
              <Skeleton className="h-4 w-20 rounded" />
            ) : balance === null ? (
              <>
                <span className="text-muted-foreground">{NO_DATA}</span>
                <span className="sr-only"> (most nem érhető el)</span>
              </>
            ) : (
              runes(balance)
            )}
          </dd>
        </div>
        <div className="flex justify-between gap-3 text-muted-foreground">
          <dt>Fizetendő</dt>
          <dd className="font-bold text-foreground">{runes(price)}</dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-border pt-2 text-muted-foreground">
          <dt>{extending ? 'Új lejárat' : 'Aktív eddig'}</dt>
          <dd className="font-bold text-foreground">{budapestDay(addDays(ownedUntil ?? now, duration))}</dd>
        </div>
      </dl>

      {short ? (
        <div className="flex flex-col gap-2.5">
          <span className="text-[13px] font-semibold text-danger">Nincs elég rúnád ehhez a vásárláshoz.</span>
          <Link
            to="/runak/vasarlas"
            className="flex h-13 items-center justify-center rounded-full border border-line bg-raised text-[15px] font-extrabold text-foreground transition-colors hover:bg-line"
          >
            Rúna-feltöltés
          </Link>
        </div>
      ) : (
        // Buying is not wired yet (frontend only): the button shows where it will be.
        <button
          type="button"
          disabled
          className="h-13 rounded-full bg-primary text-base font-extrabold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          A vásárlás hamarosan indul
        </button>
      )}

      <DialogClose className="min-h-10 self-center px-4 text-[13px] font-bold text-muted-foreground hover:text-foreground">Mégse</DialogClose>
    </div>
  )
}
