import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { ReactNode } from 'react'

import { buttonVariants } from '@/components/ui/button'

import { SoonTooltip } from './SoonTooltip'

/**
 * A button whose destination is not built yet: a faded outline that says
 * "Hamarosan" on hover, so it reads as coming rather than broken. Not
 * focusable, since there is nothing to do with it.
 */
export function SoonButton({ icon, children }: { icon: IconDefinition; children: ReactNode }) {
  return (
    <SoonTooltip>
      <span
        aria-disabled="true"
        className={buttonVariants({
          variant: 'outline',
          size: 'lg',
          className: 'h-11 cursor-not-allowed gap-2 px-4 text-muted-foreground opacity-60',
        })}
      >
        <FontAwesomeIcon icon={icon} aria-hidden="true" />
        {children}
        <span className="sr-only"> (hamarosan)</span>
      </span>
    </SoonTooltip>
  )
}
