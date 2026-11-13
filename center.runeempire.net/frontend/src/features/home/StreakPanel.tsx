import { Check, Clock, Flame, X } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import { NO_DATA, serverToday, serverTodayIndex } from './stats'

/** One day of this week's login streak, as GET /api/me/stats sends it. */
export type StreakDayStatus = 'done' | 'missed' | 'pending' | 'future' | 'before'

export type Streak = {
  /** Days in a row, today included once the player logged in. */
  current: number
  best: number
  /** This week, Monday first: seven days. */
  week: StreakDayStatus[]
}

const DAY_SHORT = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V']
const DAY_NAMES = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap']

const LOOK: Record<StreakDayStatus, { box: string; date: string; text: string }> = {
  done: { box: 'border border-ok/35 bg-ok/12', date: 'text-[#A9D9B5]', text: 'beléptél' },
  missed: { box: 'border border-danger/35 bg-danger/10', date: 'text-[#E8A49B]', text: 'kimaradt' },
  pending: { box: 'today-pulse border-2 border-primary bg-primary/8', date: 'text-primary', text: 'még nem léptél be' },
  future: { box: 'border border-line bg-sunken', date: 'text-faint', text: 'még hátravan' },
  before: { box: 'border border-dashed border-line', date: 'text-faint', text: 'regisztráció előtt' },
}

const dayCount = (days: number) => `${days} nap`

/** "11.09": month and day, as the streak boxes show them. */
function monthDay(date: Date) {
  return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

/** The dates of the server's week, Monday first, at local midnight. */
function thisWeek(today = serverToday()) {
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, index) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index))
}

type StreakPanelProps = {
  /** Left out while the stats load (skeletons); null when it could not be loaded (a dash, plain boxes). */
  streak?: Streak | null
  className?: string
}

/**
 * This week's daily logins, a small table in the hero: the streak and the
 * record on top, then seven boxes (a check for a day logged in, a cross for
 * a missed one, today pulsing gold with a clock until the login).
 */
export function StreakPanel({ streak, className }: StreakPanelProps) {
  const todayIndex = serverTodayIndex()
  const dates = thisWeek()

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2.5 md:gap-3">
          <span aria-hidden="true" className="grid size-9.5 place-items-center rounded-[10px] bg-primary/10 md:size-11 md:rounded-xl">
            <Flame className="size-5 text-primary md:size-5.5" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[11px] font-bold tracking-[0.12em] text-faint uppercase">Napi sorozat</span>
            {streak ? (
              <span className="text-xl font-extrabold text-foreground md:text-2xl">{dayCount(streak.current)}</span>
            ) : streak === null ? (
              <span className="text-xl font-extrabold text-muted-foreground md:text-2xl">
                {NO_DATA}
                <span className="sr-only"> (most nem érhető el)</span>
              </span>
            ) : (
              <Skeleton className="mt-1 h-6 w-16" />
            )}
          </span>
        </span>
        {streak && <span className="text-xs text-faint">Rekord: {dayCount(streak.best)}</span>}
      </div>

      <ol aria-label="Napi sorozat ezen a héten" aria-busy={streak === undefined} className="grid grid-cols-7 gap-1.25 md:gap-1.5">
        {dates.map((date, index) => {
          const status = streak?.week[index]
          const today = index === todayIndex

          return (
            <li key={DAY_SHORT[index]} className="flex flex-col items-center gap-1 md:gap-1.25">
              {status ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex aspect-square w-full flex-col items-center justify-center gap-0.5 rounded-lg md:rounded-[9px]',
                    LOOK[status].box,
                    today && status === 'done' && 'border-2 border-ok',
                  )}
                >
                  {status === 'done' && <Check className="size-3.5 text-ok md:size-4" strokeWidth={3} />}
                  {status === 'missed' && <X className="size-3.25 text-danger md:size-3.75" strokeWidth={3} />}
                  {status === 'pending' && <Clock className="size-3.25 text-primary md:size-3.75" strokeWidth={2.5} />}
                  <span className={cn('text-[10px] leading-none font-bold md:text-[11px]', LOOK[status].date)}>{monthDay(date)}</span>
                </span>
              ) : streak === null ? (
                <span
                  aria-hidden="true"
                  className="flex aspect-square w-full items-center justify-center rounded-lg border border-line bg-sunken text-[10px] leading-none font-bold text-faint md:rounded-[9px] md:text-[11px]"
                >
                  {monthDay(date)}
                </span>
              ) : (
                <Skeleton className="aspect-square w-full rounded-lg md:rounded-[9px]" />
              )}
              <span aria-hidden="true" className={cn('text-[11px]', today ? 'font-extrabold text-primary' : 'font-semibold text-faint')}>
                {today ? 'Ma' : DAY_SHORT[index]}
              </span>
              {status && <span className="sr-only">{`${DAY_NAMES[index]} (${monthDay(date)}): ${LOOK[status].text}`}</span>}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
