import type { ReactElement } from 'react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/** Says "Hamarosan" on hover over something whose data or page is not there yet. */
export function SoonTooltip({ children }: { children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side="top">Hamarosan</TooltipContent>
    </Tooltip>
  )
}
