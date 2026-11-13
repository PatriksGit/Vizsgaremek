import type { LucideIcon } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'

import { panelLook } from '@/components/app/Panel'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import { NO_DATA } from './stats'

type StatCardProps = {
  label: string
  icon: LucideIcon
  /** The number or word; left out while it loads (a skeleton bar), null when it could not be loaded (a dash). */
  value?: ReactNode | null
  /** A smaller word after the value, such as "rúna" or "óra". */
  unit?: string
  /** Under the value, such as a rank's expiry. */
  children?: ReactNode
  className?: string
  style?: CSSProperties
}

/** One of the overview's four numbers: the label and the value on the left, a quiet icon tile on the right. */
export function StatCard({ label, icon: Icon, value, unit, children, className, style }: StatCardProps) {
  return (
    <li
      className={cn(panelLook, 'flex min-h-21 items-center justify-between gap-3.5 px-4.5 py-4 md:min-h-29 md:px-6 md:py-5', className)}
      style={style}
    >
      <div className="flex min-w-0 flex-col gap-1.5 md:gap-2.5">
        <p className="text-sm font-bold text-soft md:text-base">{label}</p>
        {value === null ? (
          <p className="text-2xl leading-none font-extrabold text-muted-foreground md:text-3xl">
            {NO_DATA}
            <span className="sr-only"> (most nem érhető el)</span>
          </p>
        ) : value !== undefined ? (
          <p className="text-2xl leading-none font-extrabold text-foreground md:text-3xl">
            {value}
            {unit && <span className="text-sm font-bold text-muted-foreground md:text-base"> {unit}</span>}
          </p>
        ) : (
          <>
            <Skeleton className="h-6 w-20 md:h-7.5" />
            <span className="sr-only">betöltés…</span>
          </>
        )}
        {children}
      </div>
      <StatIcon icon={Icon} />
    </li>
  )
}

/** The same quiet tile on every card: colour is kept for the values that carry a status. */
export function StatIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-11 shrink-0 place-items-center rounded-xl bg-raised text-soft shadow-[inset_0_0_0_1px_rgb(255_255_255/0.07)] md:size-13 md:rounded-[14px]',
      )}
    >
      <Icon className="size-5.5 md:size-6.5" />
    </span>
  )
}
