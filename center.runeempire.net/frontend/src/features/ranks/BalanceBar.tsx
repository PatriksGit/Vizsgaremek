import { faCoins } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import { panelLook } from '@/components/app/Panel'
import { Skeleton } from '@/components/ui/skeleton'
import { NO_DATA, runeCountFormat } from '@/features/home/stats'
import { enterAfter } from '@/lib/motion'
import { cn } from '@/lib/utils'

/**
 * The player's runes above the rank cards (owner, 2026-11-17): every button
 * carries a price, so the balance is in view too. No top-up link: rune buying
 * is hidden until there is a company (owner, 2026-11-22).
 * undefined while the stats load (a skeleton), null when they cannot be read (a dash).
 * On phones it stays under the top bar while the cards scroll, so the balance
 * is in view when a price is tapped (review 2026-11-17).
 */
export function BalanceBar({ balance }: { balance: number | null | undefined }) {
  return (
    <section
      aria-label="Egyenleged"
      style={enterAfter(150)}
      className={cn(panelLook, 'content-in flex flex-wrap max-md:sticky max-md:top-15 max-md:z-20 max-md:shadow-[0_10px_20px_rgb(0_0_0/0.5)] items-center justify-between gap-x-4 gap-y-2 px-4 py-3 md:px-5')}
    >
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-lg bg-raised text-soft">
          <FontAwesomeIcon icon={faCoins} className="size-4" />
        </span>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-faint">Egyenleged</span>
          {balance === undefined ? (
            <>
              <Skeleton className="mt-1 h-5 w-24 rounded" />
              <span className="sr-only">betöltés…</span>
            </>
          ) : balance === null ? (
            <span className="text-lg leading-tight font-extrabold text-muted-foreground">
              {NO_DATA}
              <span className="sr-only"> (most nem érhető el)</span>
            </span>
          ) : (
            <span className="text-lg leading-tight font-extrabold text-foreground">{runeCountFormat.format(balance)} rúna</span>
          )}
        </div>
      </div>
    </section>
  )
}
