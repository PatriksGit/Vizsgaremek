import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

/** An icon on a gold tile. */
export function IconBadge({ icon }: { icon: IconDefinition }) {
  return (
    <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
      <FontAwesomeIcon icon={icon} className="size-4.5" />
    </span>
  )
}
