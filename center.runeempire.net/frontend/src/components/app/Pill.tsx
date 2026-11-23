import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

const TONES = {
  neutral: 'bg-raised text-soft',
  quiet: 'bg-raised text-muted-foreground',
  gold: 'bg-primary/10 text-primary',
  ok: 'bg-ok/12 text-ok',
} as const

/**
 * The site's one small rounded label (review 2026-11-23 ui S3/K3): "Hamarosan", "Csatlakozott", "Lejár:", a friend's
 * rank, Bekapcsolva/Kikapcsolva, "Szezonális", the "-13%" discount. The height and the weight stay with each caller
 * (they differ on purpose); without a tone the caller colours it (a rank colour, the solid discount badge).
 */
export function Pill({ tone, className, ...props }: ComponentProps<'span'> & { tone?: keyof typeof TONES }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 text-xs font-bold', tone && TONES[tone], className)}
      {...props}
    />
  )
}
