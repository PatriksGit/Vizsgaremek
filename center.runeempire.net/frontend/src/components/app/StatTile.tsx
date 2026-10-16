import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import type { CSSProperties, ReactNode } from 'react'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import { IconBadge } from './IconBadge'
import { Panel } from './Panel'
import type { Tone } from './tones'

type StatTileProps = {
  icon: IconDefinition
  tone: Tone
  label: string
  /** The number to show; left out while the server has not sent it. */
  value?: ReactNode
  className?: string
  style?: CSSProperties
}

/** One number in a compact tile: icon top left, a small label under it, then the value. */
export function StatTile({ icon, tone, label, value, className, style }: StatTileProps) {
  return (
    <Panel as="li" className={cn('p-4', className)} style={style}>
      <IconBadge icon={icon} tone={tone} className="size-9" />
      <p className="mt-3 truncate text-sm text-muted-foreground">{label}</p>
      {value !== undefined ? (
        <p className="text-xl font-semibold text-foreground tabular-nums">{value}</p>
      ) : (
        <>
          <Skeleton className="mt-1.5 h-5 w-16" />
          <span className="sr-only">még nincs adat</span>
        </>
      )}
    </Panel>
  )
}
