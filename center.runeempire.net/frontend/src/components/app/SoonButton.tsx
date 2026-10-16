import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { ReactNode } from 'react'

import { buttonVariants } from '@/components/ui/button'

/**
 * A button whose destination is not built yet: shown in a quiet outline with
 * a small "Hamarosan" chip, so it reads as coming rather than broken. Not
 * focusable, since there is nothing to do with it.
 */
export function SoonButton({ icon, children }: { icon: IconDefinition; children: ReactNode }) {
  return (
    <span
      aria-disabled="true"
      className={buttonVariants({ variant: 'outline', size: 'lg', className: 'h-11 cursor-not-allowed gap-2 px-4 text-muted-foreground' })}
    >
      <FontAwesomeIcon icon={icon} aria-hidden="true" />
      {children}
      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] leading-none text-muted-foreground uppercase">Hamarosan</span>
    </span>
  )
}
