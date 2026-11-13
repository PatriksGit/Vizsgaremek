import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

type IconBadgeProps = {
  /** A Font Awesome icon, or a Lucide one (the menu's icons). */
  icon: IconDefinition | LucideIcon
  className?: string
}

/** An icon on a gold tile. */
export function IconBadge({ icon, className }: IconBadgeProps) {
  const Icon = icon
  return (
    <span aria-hidden="true" className={cn('grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary', className)}>
      {'iconName' in Icon ? <FontAwesomeIcon icon={Icon} className="size-4.5" /> : <Icon className="size-4.5" />}
    </span>
  )
}
