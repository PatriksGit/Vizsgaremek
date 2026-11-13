import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import { cn } from '@/lib/utils'

type IconBadgeProps = {
  icon: IconDefinition
  className?: string
}

/** An icon on a gold tile. */
export function IconBadge({ icon, className }: IconBadgeProps) {
  return (
    <span aria-hidden="true" className={cn('grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary', className)}>
      <FontAwesomeIcon icon={icon} className="size-4.5" />
    </span>
  )
}
