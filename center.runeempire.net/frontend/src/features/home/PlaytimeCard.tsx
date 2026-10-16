import { faChartColumn } from '@fortawesome/free-solid-svg-icons'

import { Panel, PanelHeader } from '@/components/app/Panel'
import { enterAfter } from '@/lib/motion'
import { cn } from '@/lib/utils'

const DAYS = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V']

const hoursFormat = new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 1 })

type PlaytimeCardProps = {
  /** Hours played on each day of this week, Monday first; left out until the server sends them. */
  week?: number[]
}

/**
 * This week's playtime per day, today in gold. Without data it shows only the
 * empty week and a note: no invented bars.
 */
export function PlaytimeCard({ week }: PlaytimeCardProps) {
  const today = (new Date().getDay() + 6) % 7

  return (
    <Panel as="section" className="content-in flex flex-col gap-6 lg:col-span-2" style={enterAfter(900)}>
      <PanelHeader icon={faChartColumn} tone="xp" title="Játékidő ezen a héten" />

      <div className="flex min-h-56 flex-1 flex-col gap-2">
        {week ? (
          <ol className="grid flex-1 grid-cols-7 items-end gap-3">
            {week.map((value, day) => (
              <li key={DAYS[day]} className="flex h-full flex-col items-center justify-end gap-2">
                <span className={cn('text-xs tabular-nums', day === today ? 'text-primary' : 'text-muted-foreground')}>
                  <span className="sr-only">{DAYS[day]}: </span>
                  {hoursFormat.format(value)} ó
                </span>
                <span
                  className={cn('w-full max-w-12 rounded-t-md bg-linear-to-t', day === today ? 'from-primary/40 to-primary' : 'from-xp/10 to-xp/80')}
                  style={{ height: `${(value / Math.max(...week, 1)) * 100}%` }}
                />
              </li>
            ))}
          </ol>
        ) : (
          <div className="flex flex-1 items-center justify-center border-b border-dashed border-white/10 px-6 pb-4 text-center">
            <p className="max-w-sm text-sm text-muted-foreground">
              Amint a szerver elküldi a játékidődet, itt látod napra bontva, mennyit játszottál a héten.
            </p>
          </div>
        )}

        <ol aria-hidden="true" className="grid grid-cols-7 gap-3">
          {DAYS.map((name, day) => (
            <li key={name} className={cn('text-center text-sm', day === today ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
              {name}
            </li>
          ))}
        </ol>
      </div>
    </Panel>
  )
}
