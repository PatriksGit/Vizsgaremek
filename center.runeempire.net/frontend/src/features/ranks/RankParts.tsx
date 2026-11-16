import { faBagShopping, faClock, faImage, faRotate } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import { cn } from '@/lib/utils'

import { timeLeft } from './dates'
import type { Rank } from './ranks'

/** The rank's animated banner, 3:1; a dashed box until it has one. */
export function RankBanner({ rank, className, decorative = false }: { rank: Rank; className?: string; decorative?: boolean }) {
  return (
    <div className={cn('flex aspect-3/1 items-center justify-center border-b border-border bg-background px-4 py-3.5', className)}>
      {rank.gif ? (
        <img
          src={rank.gif}
          alt={decorative ? '' : `${rank.name} rang animációja`}
          aria-hidden={decorative || undefined}
          className="size-full object-contain"
        />
      ) : (
        <span className="flex size-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line text-faint">
          <FontAwesomeIcon icon={faImage} aria-hidden="true" className="size-5" />
          <span className="text-xs font-bold">A rang GIF-je ide kerül</span>
        </span>
      )}
    </div>
  )
}

const pad = (n: number) => String(n).padStart(2, '0')

/** "Még 40 nap 11:00:00" until a seasonal rank's end, then that it is over. */
export function SeasonCountdown({ endsAt, now }: { endsAt: string; now: Date }) {
  const left = new Date(endsAt).getTime() - now.getTime()
  const { days, hours, minutes, seconds } = timeLeft(left)
  const over = left <= 0
  const label = over ? 'A vásárlási idő lejárt' : `Még ${days} nap ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  const spoken = over ? label : `Még ${days} nap ${hours} óra ${minutes} perc vásárolható`

  return (
    <span role="timer" aria-label={spoken} className="inline-flex items-center gap-1.5 self-start text-[13px] font-bold text-primary">
      <FontAwesomeIcon icon={faClock} aria-hidden="true" className="size-3.5" />
      {label}
    </span>
  )
}

/** The gold pill that opens the purchase: buying, or extending a rank the player has. */
export function BuyButton({ owned, onClick, className }: { owned: boolean; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-extrabold text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        className,
      )}
    >
      <FontAwesomeIcon icon={owned ? faRotate : faBagShopping} aria-hidden="true" className="size-4" />
      {owned ? 'Meghosszabbítás' : 'Megvásárlás'}
    </button>
  )
}

/** In place of the buy button once a seasonal rank's time is over. */
export function NoLongerSold({ className }: { className?: string }) {
  return (
    <span
      aria-disabled="true"
      className={cn(
        'flex h-12 w-full items-center justify-center rounded-full border border-line bg-sunken text-[15px] font-bold text-faint',
        className,
      )}
    >
      Már nem vásárolható
    </span>
  )
}
