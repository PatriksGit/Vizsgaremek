import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import { cn } from '@/lib/utils'

import { TONE, type Tone } from './tones'

type IconBadgeProps = {
  icon: IconDefinition
  tone: Tone
  className?: string
}

/** An icon on a tile of its data's colour: the only place the accent colours appear. */
export function IconBadge({ icon, tone, className }: IconBadgeProps) {
  return (
    <span aria-hidden="true" className={cn('grid size-10 shrink-0 place-items-center rounded-xl', TONE[tone], className)}>
      <FontAwesomeIcon icon={icon} className="size-4.5" />
    </span>
  )
}
