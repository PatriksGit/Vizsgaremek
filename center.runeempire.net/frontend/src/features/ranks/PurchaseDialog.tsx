import { faQuestion, faXmark, type IconDefinition } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { type ReactNode, useId } from 'react'
import { Link } from 'react-router'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { runeCountFormat } from '@/features/home/stats'
import { cn } from '@/lib/utils'

import type { Rank } from './api'
import { addDays, budapestDay, seasonOver } from './dates'

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
  /**
   * Open or closing. The rank stays while it closes, so the exit animation shows its content, not an
   * empty frame (review 2026-11-17, UI-N2); without it, open while there is a rank.
   */
  open?: boolean
  /** The exit animation has finished: the rank can go. */
  onClosed?: () => void
  /** Where focus goes when it closes (true: back to what opened it). */
  finalFocus?: () => HTMLElement | true
}

const buttonLook = 'flex min-h-12 items-center justify-center rounded-full px-4 text-[15px] font-extrabold transition-colors'

/**
 * The popup a duration button opens (owner, 2026-11-17): it checks the runes
 * first. Too few -> an X in a circle, "Nincs elég rúnád a rang
 * megvásárlásához.", how many are missing, Rúna-feltöltés or Bezárás. Enough
 * (or a balance that cannot be read: it never claims a shortage it cannot
 * see) -> a ? in a circle, "Biztosan szeretnéd megvásárolni a rangot?", the
 * price and the expiry, then Igen / Mégse. A seasonal rank whose time ran out
 * while it was open can no longer be bought. Buying is not wired yet
 * (frontend only), so Igen is off and says so.
 *
 * A shadcn AlertDialog: no X in the corner and a tap beside it does not close
 * it; only its buttons or Esc do.
 */
export function PurchaseDialog({
  rank,
  days,
  ownedUntil,
  balance,
  now,
  onClose,
  open = rank !== null,
  onClosed,
  finalFocus,
}: PurchaseDialogProps) {
  const price = rank?.prices.find((option) => option.days === days)?.runes ?? 0
  const extending = ownedUntil !== null
  const missing = typeof balance === 'number' ? price - balance : 0
  const hintId = useId()

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      onOpenChangeComplete={(next) => !next && onClosed?.()}
    >
      <AlertDialogContent
        finalFocus={finalFocus}
        className="max-h-[calc(100svh-2rem)] justify-items-center gap-5 overflow-y-auto rounded-2xl border border-line bg-card px-6 pt-8 pb-6 text-center ring-0 data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-100"
      >
        {rank &&
          (seasonOver(rank, now) ? (
            <Popup icon={faXmark} tone="danger" title="Ez a rang már nem vásárolható." body={`${rank.name} · a szezon véget ért.`}>
              <AlertDialogCancel variant="ghost" className={cn(buttonLook, 'h-auto w-full bg-raised text-foreground hover:bg-raised/80')}>
                Bezárás
              </AlertDialogCancel>
            </Popup>
          ) : missing > 0 ? (
            <Popup
              icon={faXmark}
              tone="danger"
              title={`Nincs elég rúnád a rang ${extending ? 'meghosszabbításához' : 'megvásárlásához'}.`}
              body={
                <>
                  <span>{`${rank.name} · ${days} nap · ${runeCountFormat.format(price)} rúna`}</span>
                  <span className="font-semibold text-danger">Még {runeCountFormat.format(missing)} rúna hiányzik.</span>
                </>
              }
            >
              <div className="grid w-full grid-cols-2 gap-3">
                <Link to="/runak/vasarlas" className={cn(buttonLook, 'bg-primary text-primary-foreground hover:bg-primary/85')}>
                  Rúna-feltöltés
                </Link>
                <AlertDialogCancel variant="ghost" className={cn(buttonLook, 'h-auto bg-raised text-foreground hover:bg-raised/80')}>
                  Bezárás
                </AlertDialogCancel>
              </div>
            </Popup>
          ) : (
            <Popup
              icon={faQuestion}
              tone="primary"
              title={`Biztosan szeretnéd ${extending ? 'meghosszabbítani' : 'megvásárolni'} a rangot?`}
              body={
                <>
                  <span>{`${rank.name} · ${days} nap`}</span>
                  <span className="text-2xl font-extrabold text-foreground">{runeCountFormat.format(price)} rúna</span>
                  <span>
                    {extending ? 'Új lejárat' : 'Lejárat'}:{' '}
                    <strong className="text-foreground">{budapestDay(addDays(ownedUntil ?? now, days))}</strong>
                  </span>
                  <span className="mt-1 text-xs font-semibold text-soft">A vásárlás nem visszavonható.</span>
                </>
              }
            >
              <div className="flex w-full flex-col gap-1.5">
                {/* "Igen v Mégse" (owner, 2026-11-17): Igen first, green; Mégse red. */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Buying is not wired yet (frontend only): the button shows where it will be. */}
                  <button
                    type="button"
                    disabled
                    aria-describedby={hintId}
                    className={cn(buttonLook, 'bg-ok text-background disabled:cursor-not-allowed disabled:opacity-50')}
                  >
                    Igen
                  </button>
                  <AlertDialogCancel variant="ghost" className={cn(buttonLook, 'h-auto bg-danger text-background hover:bg-danger/85 hover:text-background')}>
                    Mégse
                  </AlertDialogCancel>
                </div>
                <span id={hintId} className="text-xs font-semibold text-faint">
                  A vásárlás hamarosan indul.
                </span>
              </div>
            </Popup>
          ))}
      </AlertDialogContent>
    </AlertDialog>
  )
}

const tones = {
  primary: 'border-primary/45 text-primary',
  danger: 'border-danger/45 text-danger',
}

/** The popup's body: the icon in a circle, the question, its details, then its buttons. */
function Popup({
  icon,
  tone,
  title,
  body,
  children,
}: {
  icon: IconDefinition
  tone: keyof typeof tones
  title: string
  body: ReactNode
  children: ReactNode
}) {
  return (
    <>
      <span aria-hidden="true" className={cn('popup-icon flex size-18 items-center justify-center rounded-full border-4', tones[tone])}>
        <FontAwesomeIcon icon={icon} className="size-8" />
      </span>
      <div className="flex flex-col items-center gap-2">
        <AlertDialogTitle className="font-heading text-[22px] leading-tight font-bold text-balance">{title}</AlertDialogTitle>
        <AlertDialogDescription render={<div />} className="flex flex-col items-center gap-1 text-sm text-pretty text-muted-foreground">
          {body}
        </AlertDialogDescription>
      </div>
      {children}
    </>
  )
}
