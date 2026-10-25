import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router'

import { Skeleton } from '@/components/ui/skeleton'
import { blurAfterPointerClick } from '@/lib/focus'
import { cn } from '@/lib/utils'

import { IconBadge } from './IconBadge'
import { Panel, panelLook } from './Panel'
import type { Tone } from './tones'

type StatTileProps = {
  icon: IconDefinition
  tone: Tone
  label: string
  /** The number to show. Left out while there is none yet: a skeleton bar instead. */
  value?: ReactNode
  /** The page with the details, when there is one: the whole tile becomes a link to it. */
  to?: string
  className?: string
  style?: CSSProperties
}

/** One number in a compact tile: icon top left, a small label under it, then the value. */
export function StatTile({ icon, tone, label, value, to, className, style }: StatTileProps) {
  const content = (
    <>
      <IconBadge icon={icon} tone={tone} className="size-9" />
      <p className="mt-3 truncate text-sm text-muted-foreground">{label}</p>
      {value !== undefined ? (
        <p className="text-xl font-semibold text-foreground tabular-nums">{value}</p>
      ) : (
        <>
          <Skeleton className="mt-1.5 h-5 w-16" />
          <span className="sr-only">betöltés…</span>
        </>
      )}
    </>
  )

  if (to) {
    return (
      <li className={className} style={style}>
        <Link
          to={to}
          onClick={blurAfterPointerClick}
          className={cn(
            panelLook,
            'block h-full p-4 transition-colors hover:border-primary/30 hover:from-white/6',
            'outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          )}
        >
          {content}
        </Link>
      </li>
    )
  }

  return (
    <Panel as="li" className={cn('p-4', className)} style={style}>
      {content}
    </Panel>
  )
}
