import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

import { TONE, type Tone } from './tones'

type IconBadgeProps = {
  /** A Font Awesome icon, or a Lucide one (the menu's icons). */
  icon: IconDefinition | LucideIcon
  tone: Tone
  className?: string
}

/** An icon on a tile of its data's colour. */
export function IconBadge({ icon, tone, className }: IconBadgeProps) {
  const Icon = icon
  return (
    <span aria-hidden="true" className={cn('grid size-10 shrink-0 place-items-center rounded-xl', TONE[tone], className)}>
      {'iconName' in Icon ? <FontAwesomeIcon icon={Icon} className="size-4.5" /> : <Icon className="size-4.5" />}
    </span>
  )
}
