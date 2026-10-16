import { faChartColumn } from '@fortawesome/free-solid-svg-icons'

import { Panel, PanelHeader } from '@/components/app/Panel'
import { enterAfter } from '@/lib/motion'
import { cn } from '@/lib/utils'

const DAYS = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V']

/** Shapes the blurred bars behind the empty state; never shown as numbers. */
const GHOST_WEEK = [1.5, 3, 2.2, 4.6, 6, 7.8, 5]

const hoursFormat = new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 1 })

type PlaytimeCardProps = {
  /** Hours played on each day of this week, Monday first; left out until the server sends them. */
  week?: number[]
}

/** This week's playtime per day, today in gold. Without data, blurred bars under a note. */
export function PlaytimeCard({ week }: PlaytimeCardProps) {
  const hours = week ?? GHOST_WEEK
  const max = Math.max(...hours, 1)
  const today = (new Date().getDay() + 6) % 7

  return (
    <Panel as="section" className="content-in flex flex-col gap-6 lg:col-span-2" style={enterAfter(900)}>
      <PanelHeader icon={faChartColumn} tone="xp" title="Játékidő ezen a héten" />

      <div className="flex min-h-72 flex-1 flex-col gap-2">
        <div className="relative flex flex-1 flex-col">
          {/* Without data the bars alone fade and blur, under the note. */}
          <ol
            aria-hidden={!week || undefined}
            className={cn('grid flex-1 grid-cols-7 items-end gap-3', !week && 'opacity-35 blur-[2px]')}
          >
            {hours.map((value, day) => (
              <li key={DAYS[day]} className="flex h-full flex-col items-center justify-end gap-2">
                {week && (
                  <span className={cn('text-xs tabular-nums', day === today ? 'text-primary' : 'text-muted-foreground')}>
                    <span className="sr-only">{DAYS[day]}: </span>
                    {hoursFormat.format(value)} ó
                  </span>
                )}
                <span
                  className={cn(
                    'w-full max-w-12 rounded-t-md bg-linear-to-t',
                    day === today ? 'from-primary/40 to-primary' : 'from-xp/10 to-xp/80',
                  )}
                  style={{ height: `${(value / max) * 100}%` }}
                />
              </li>
            ))}
          </ol>
          {!week && (
            <p className="absolute inset-0 grid place-items-center px-6 text-center text-foreground">
              Hamarosan itt látod, mennyit játszottál a héten.
            </p>
          )}
        </div>

        {/* The day names: their own row, never blurred. */}
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
