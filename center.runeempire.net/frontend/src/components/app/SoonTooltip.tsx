import type { ReactElement } from 'react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type SoonTooltipProps = {
  children: ReactElement
  /** Where the tooltip opens; under a navbar item rather than off the top of the window. */
  side?: 'top' | 'right' | 'bottom'
}

/** Says "Hamarosan" on hover over something whose data or page is not there yet. */
export function SoonTooltip({ children, side = 'top' }: SoonTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side={side}>Hamarosan</TooltipContent>
    </Tooltip>
  )
}
