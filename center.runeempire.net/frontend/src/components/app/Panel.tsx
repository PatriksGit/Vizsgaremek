import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

/**
 * The one card surface of the logged-in pages: same background, border,
 * corners and padding everywhere, a hairline of light along the top edge.
 * Exported for the few cards that must be another element, such as a link.
 */
export const panelLook =
  'rounded-2xl border border-border bg-card p-6 shadow-[inset_0_1px_0_rgb(255_255_255/0.04),0_1px_2px_rgb(0_0_0/0.35)]'

type PanelProps = HTMLAttributes<HTMLElement> & {
  /** The element to render, for the right meaning in its context. */
  as?: 'div' | 'section' | 'li'
}

export function Panel({ as: Element = 'div', className, ...props }: PanelProps) {
  return <Element className={cn(panelLook, className)} {...props} />
}
