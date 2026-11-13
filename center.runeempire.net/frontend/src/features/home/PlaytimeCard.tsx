import { TrendingUp } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ReferenceArea, XAxis, YAxis } from 'recharts'

import { panelLook } from '@/components/app/Panel'
import { type ChartConfig, ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { enterAfter } from '@/lib/motion'
import { cn } from '@/lib/utils'

const DAY_SHORT = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V']
const DAY_NAMES = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap']

/** Shapes the faded curve behind the "coming soon" note; never shown as numbers. */
const GHOST_WEEK = [45, 90, 30, 120, 75, 100, 60]

const chartConfig = { minutes: { label: 'Játékidő', color: 'var(--primary)' } } satisfies ChartConfig

/** "1 ó 30 p", "2 ó", "45 p". */
function duration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest} p`
  return rest ? `${hours} ó ${rest} p` : `${hours} ó`
}

type PlaytimeCardProps = {
  /** Minutes played on each day of this week so far, Monday first; left out until the server sends them. */
  week?: number[]
  className?: string
}

/**
 * This week's playtime as a gold line over the days, today's column lit.
 * Hovering a day shows its time. Without data: a faded curve under a note.
 */
export function PlaytimeCard({ week, className }: PlaytimeCardProps) {
  const todayIndex = (new Date().getDay() + 6) % 7
  const shown = (week ?? GHOST_WEEK).slice(0, todayIndex + 1)
  const total = week ? week.reduce((sum, minutes) => sum + minutes, 0) : 0

  // Three equal steps of whole hours, high enough for the best day.
  const step = Math.max(1, Math.ceil(Math.max(...shown, 0) / 60 / 3)) * 60
  const rows = DAY_SHORT.map((_, index) => ({
    day: index,
    minutes: index <= todayIndex ? (shown[index] ?? 0) : null,
  }))

  const note = !week
    ? 'Hamarosan itt látod, mennyit játszottál a héten.'
    : total === 0
      ? 'Még nincs játékidőd ezen a héten'
      : null

  return (
    <section
      aria-labelledby="playtime-title"
      className={cn(panelLook, 'content-in flex flex-col gap-3.5 p-5 md:gap-4 md:p-6', className)}
      style={enterAfter(900)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="playtime-title" className="font-heading text-lg font-bold text-foreground md:text-xl">
          Játékidő ezen a héten
        </h2>
        {week && (
          <span className="text-[13px] text-muted-foreground">
            Összesen: <strong className="text-foreground">{duration(total)}</strong>
          </span>
        )}
      </div>

      <div className="relative">
        <ChartContainer
          config={chartConfig}
          className={cn('aspect-auto h-47 w-full md:h-62', !week && 'opacity-35 blur-[2px]')}
          aria-hidden={!week || undefined}
          role={week ? 'img' : undefined}
          aria-label={week ? `Játékidő ezen a héten, összesen ${duration(total)}` : undefined}
        >
          <AreaChart data={rows} margin={{ top: 28, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="playtime-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--color-minutes)" stopOpacity={0.3} />
                <stop offset="1" stopColor="var(--color-minutes)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="4 4" />
            {/* Today's column, faintly gold. */}
            <ReferenceArea x1={todayIndex} x2={todayIndex} fill="var(--primary)" fillOpacity={0.06} radius={8} ifOverflow="visible" />
            <XAxis
              dataKey="day"
              scale="band"
              interval={0}
              tickLine={false}
              axisLine={{ stroke: '#35302a' }}
              tickMargin={10}
              tick={({ x, y, payload }) => {
                const today = payload.value === todayIndex
                return (
                  <text
                    x={x}
                    y={y}
                    dy={8}
                    textAnchor="middle"
                    className={cn('text-xs', today ? 'fill-primary font-extrabold' : 'fill-faint font-semibold')}
                  >
                    {today ? `${DAY_SHORT[payload.value]} · ma` : DAY_SHORT[payload.value]}
                  </text>
                )
              }}
            />
            <YAxis
              width={34}
              domain={[0, step * 3]}
              ticks={[0, step, step * 2, step * 3]}
              tickFormatter={(minutes: number) => (minutes ? `${minutes / 60} ó` : '0')}
              tickLine={false}
              axisLine={false}
              tick={{ className: 'fill-faint text-[11px] font-semibold' }}
            />
            {week && (
              <ChartTooltip
                cursor={{ stroke: 'var(--primary)', strokeOpacity: 0.5, strokeDasharray: '4 4' }}
                content={({ active, payload }) => {
                  const row = payload?.[0]?.payload as (typeof rows)[number] | undefined
                  if (!active || !row || row.minutes === null) return null
                  return (
                    <div className="flex flex-col items-center gap-0.5 rounded-lg border border-[#2f2a21] bg-popover px-2.5 py-1.5 leading-tight shadow-[0_8px_20px_rgb(0_0_0/0.45)]">
                      <span className="text-[11px] font-semibold text-muted-foreground">{DAY_NAMES[row.day]}</span>
                      <span className="text-[13px] font-extrabold text-foreground">{duration(row.minutes)}</span>
                    </div>
                  )
                }}
              />
            )}
            <Area
              dataKey="minutes"
              type="linear"
              stroke="var(--color-minutes)"
              strokeWidth={2.5}
              fill="url(#playtime-fill)"
              isAnimationActive={false}
              dot={({ cx, cy, index }) => {
                const today = index === todayIndex
                if (cx === undefined || cy === undefined || rows[index].minutes === null) return <g key={index} />
                return (
                  <circle
                    key={index}
                    cx={cx}
                    cy={cy}
                    r={today ? 6 : 4}
                    fill={today ? 'var(--primary)' : 'var(--card)'}
                    stroke="var(--primary)"
                    strokeWidth={2}
                  />
                )
              }}
              activeDot={{ r: 6, fill: 'var(--primary)', stroke: 'var(--card)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ChartContainer>

        {note && (
          <div className="absolute top-[45%] left-1/2 flex -translate-1/2 items-center gap-2.5 rounded-xl border border-line bg-sunken px-4 py-3 text-center text-sm font-bold text-foreground max-sm:w-[85%]">
            <TrendingUp className="size-4.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            {note}
          </div>
        )}
      </div>
    </section>
  )
}
