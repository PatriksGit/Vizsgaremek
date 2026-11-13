import { Check, Flame, X } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** One day of this week's login streak. `unknown`: a past day the server has not told about yet. */
export type StreakDayStatus = 'done' | 'missed' | 'pending' | 'future' | 'before' | 'unknown'

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
  unknown: { box: 'border border-line bg-sunken', date: 'text-faint', text: 'nincs még adat' },
}

const dayCount = (days: number) => `${days} nap`

/** "11.09": month and day, as the streak boxes show them. */
function monthDay(date: Date) {
  return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

/** The dates of this week, Monday first, at local midnight. */
function thisWeek(today = new Date()) {
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, index) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index))
}

/**
 * Until the server sends the streak: days before the registration as such,
 * today waiting for a login, the rest of the week ahead, and the past days
 * since the registration as not known yet (never as missed).
 */
function weekWithoutData(registeredAt: string | null | undefined): StreakDayStatus[] {
  const todayIndex = (new Date().getDay() + 6) % 7
  const registered = registeredAt ? new Date(registeredAt) : null
  const registeredDay = registered && new Date(registered.getFullYear(), registered.getMonth(), registered.getDate())

  return thisWeek().map((day, index) => {
    if (index > todayIndex) return 'future'
    if (registeredDay && day < registeredDay) return 'before'
    return index === todayIndex ? 'pending' : 'unknown'
  })
}

type StreakPanelProps = {
  /** Left out until the stats API sends it: the count shows a skeleton, the week what is known. */
  streak?: Streak
  registeredAt?: string | null
  className?: string
}

/**
 * This week's daily logins inside the hero: the streak and the record on
 * top, seven boxes (a check for a day logged in, a cross for a missed one,
 * today pulsing gold until the login), and a line of encouragement.
 */
export function StreakPanel({ streak, registeredAt, className }: StreakPanelProps) {
  const todayIndex = (new Date().getDay() + 6) % 7
  const week = streak?.week ?? weekWithoutData(registeredAt)
  const dates = thisWeek()

  const message = !streak
    ? 'Hamarosan itt követheted, hány napja lépsz be egymás után.'
    : streak.week[todayIndex] === 'done'
      ? 'Ma már beléptél, így tovább!'
      : streak.current > 0
        ? 'Lépj be ma is, és nő a sorozatod.'
        : 'Lépj be ma, és elindul a sorozatod.'

  return (
    <div className={cn('flex flex-col gap-3 md:gap-3.5', className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2.5 md:gap-3">
          <span aria-hidden="true" className="grid size-9.5 place-items-center rounded-[10px] bg-primary/10 md:size-11 md:rounded-xl">
            <Flame className="size-5 text-primary md:size-5.5" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[11px] font-bold tracking-[0.12em] text-faint uppercase">Napi sorozat</span>
            {streak ? (
              <span className="text-xl font-extrabold text-foreground md:text-2xl">{dayCount(streak.current)}</span>
            ) : (
              <Skeleton className="mt-1 h-6 w-16" />
            )}
          </span>
        </span>
        {streak && <span className="text-xs text-faint">Rekord: {dayCount(streak.best)}</span>}
      </div>

      <ol aria-label="Napi sorozat ezen a héten" className="grid grid-cols-7 gap-1.25 md:gap-1.5">
        {week.map((status, index) => {
          const look = LOOK[status]
          const today = index === todayIndex
          return (
            <li key={DAY_SHORT[index]} className="flex flex-col items-center gap-1 md:gap-1.25">
              <span
                aria-hidden="true"
                className={cn(
                  'flex aspect-square w-full flex-col items-center justify-center gap-0.5 rounded-lg md:rounded-[9px]',
                  look.box,
                  today && status === 'done' && 'border-2 border-ok',
                )}
              >
                {status === 'done' && <Check className="size-3.5 text-ok md:size-4" strokeWidth={3} />}
                {status === 'missed' && <X className="size-3.25 text-danger md:size-3.75" strokeWidth={3} />}
                <span className={cn('text-[10px] leading-none font-bold md:text-[11px]', look.date)}>{monthDay(dates[index])}</span>
              </span>
              <span aria-hidden="true" className={cn('text-[11px]', today ? 'font-extrabold text-primary' : 'font-semibold text-faint')}>
                {today ? 'Ma' : DAY_SHORT[index]}
              </span>
              <span className="sr-only">{`${DAY_NAMES[index]} (${monthDay(dates[index])}): ${look.text}`}</span>
            </li>
          )
        })}
      </ol>

      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  )
}
