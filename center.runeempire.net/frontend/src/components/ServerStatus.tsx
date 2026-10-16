import { useDiscordWidget } from '@/features/home/discord'
import { useCountUp } from '@/hooks/useCountUp'
import { cn } from '@/lib/utils'

type ServerStatusProps = {
  className?: string
  /** Milliseconds before the count starts spinning up, so it starts once the line is visible. */
  countAfter?: number
}

/**
 * How many are online on the Discord right now: the one live number the site
 * has before the game server's own data is wired. Nothing shows while it
 * loads or when Discord cannot be reached.
 */
export function ServerStatus({ className, countAfter = 0 }: ServerStatusProps) {
  const { data: widget } = useDiscordWidget()
  const count = widget?.presence_count ?? 0
  const shownCount = useCountUp(count, { delayMs: countAfter })

  if (!widget) return null

  return (
    <p className={cn('inline-flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <span className="size-2 rounded-full bg-xp" aria-hidden="true" />
      <span>
        Jelenleg{' '}
        <strong className="font-semibold text-foreground tabular-nums">
          {/* Screen readers get the final count, not every step of the spin-up. */}
          <span aria-hidden="true">{shownCount}</span>
          <span className="sr-only">{count}</span>
        </strong>{' '}
        tag online a Discordon
      </span>
    </p>
  )
}
