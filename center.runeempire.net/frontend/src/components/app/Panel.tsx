import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { IconBadge } from './IconBadge'
import type { Tone } from './tones'

type PanelProps = HTMLAttributes<HTMLElement> & {
  /** The element to render, for the right meaning in its context. */
  as?: 'div' | 'section' | 'li'
}

/**
 * The one card surface of the logged-in pages: same background, border,
 * corners and padding everywhere, faintly lighter at the top so it is not flat.
 */
export function Panel({ as: Element = 'div', className, ...props }: PanelProps) {
  return (
    <Element
      className={cn('rounded-2xl border border-white/8 bg-card/85 bg-linear-to-b from-white/3 to-transparent p-6', className)}
      {...props}
    />
  )
}

type PanelHeaderProps = {
  icon: IconDefinition
  tone: Tone
  title: string
  /** Anything that sits on the right of the title. */
  children?: ReactNode
}

/** A card's title with its icon badge. */
export function PanelHeader({ icon, tone, title, children }: PanelHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <IconBadge icon={icon} tone={tone} />
      <h2 className="font-heading text-xl text-foreground">{title}</h2>
      {children}
    </div>
  )
}
