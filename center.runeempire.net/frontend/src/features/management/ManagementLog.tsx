import { panelLook } from '@/components/app/Panel'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formMessage } from '@/lib/api'
import { budapestDayAndTime, dateOrDash } from '@/lib/budapest'
import { cn } from '@/lib/utils'

import { actionText } from './actionText'
import { useManagementActions } from './playersApi'

const cardClass = cn(panelLook, 'flex flex-col gap-1 px-4 py-3')

/**
 * The Napló tab (owner, 2026-11-26): every staff action, newest first, as a
 * sentence with the manager's Google address and the time; 25 at a time.
 */
export function ManagementLog() {
  const log = useManagementActions()
  const actions = log.data?.pages.flatMap((page) => page.data)

  if (!actions) {
    if (log.isFetched) {
      return (
        <p role="alert" className="text-center text-muted-foreground">
          {formMessage(log.error, 'A naplót most nem sikerült betölteni.')}
        </p>
      )
    }
    return (
      <div aria-busy="true">
        <span className="sr-only">Betöltés…</span>
        <ul aria-hidden="true" className="flex flex-col gap-2">
          {[64, 48, 56].map((width) => (
            <li key={width} className={cardClass}>
              <Skeleton className="h-4" style={{ width: `${width}%` }} />
              <Skeleton className="h-3 w-40" />
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (actions.length === 0) {
    return <p className="text-center text-muted-foreground">Még nincs bejegyzés.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <ul aria-label="Napló" className="flex flex-col gap-2">
        {actions.map((action) => (
          <li key={action.id} className={cardClass}>
            <span className="text-foreground [overflow-wrap:anywhere]">{actionText(action)}</span>
            <span className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
              {action.manager.email} · {dateOrDash(action.created_at, budapestDayAndTime)}
            </span>
          </li>
        ))}
      </ul>
      {log.hasNextPage && (
        <Button
          type="button"
          variant="outline"
          onClick={() => void log.fetchNextPage()}
          disabled={log.isFetchingNextPage}
          className="h-11 w-fit self-center rounded-full px-5 font-bold"
        >
          {log.isFetchingNextPage ? 'Betöltés…' : 'Több betöltése'}
        </Button>
      )}
    </div>
  )
}
