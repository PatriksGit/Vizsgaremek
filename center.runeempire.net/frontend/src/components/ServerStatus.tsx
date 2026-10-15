import { site } from '@/config/site'
import { useCountUp } from '@/hooks/useCountUp'
import { cn } from '@/lib/utils'

export function ServerStatus({ className }: { className?: string }) {
  const shownCount = useCountUp(site.playersOnline)

  return (
    <p className={cn('inline-flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <span className="size-2 rounded-full bg-xp shadow-[0_0_8px_var(--xp)]" aria-hidden="true" />
      <span>
        Jelenleg{' '}
        <strong className="font-semibold text-foreground tabular-nums">
          {/* Screen readers get the final count, not every step of the spin-up. */}
          <span aria-hidden="true">{shownCount}</span>
          <span className="sr-only">{site.playersOnline}</span>
        </strong>{' '}
        játékos online
      </span>
    </p>
  )
}
