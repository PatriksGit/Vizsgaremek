import { NO_DATA } from '@/lib/noData'

/**
 * The server's days and numbers, one copy for the whole site (review 2026-11-23, home S2 + ranks-players S1/S2).
 *
 * The zone the game and RuneActivity count their days in (the backend's runeactivity.timezone): every day the site
 * writes (the streak, the week, "Lejár:", "Csatlakozott", the rank shop's dates) is a Budapest day, whatever zone the
 * browser is in. A move to another server zone changes this one line.
 */
const SERVER_ZONE = 'Europe/Budapest'

export const DAY_MS = 86_400_000

const dayParts = new Intl.DateTimeFormat('en-CA', { timeZone: SERVER_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })

const longDay = new Intl.DateTimeFormat('hu-HU', { timeZone: SERVER_ZONE, year: 'numeric', month: 'long', day: 'numeric' })
const dayAndTime = new Intl.DateTimeFormat('hu-HU', { timeZone: SERVER_ZONE, dateStyle: 'medium', timeStyle: 'short' })
const clock = new Intl.DateTimeFormat('en-GB', { timeZone: SERVER_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

/**
 * An API date written by `format`, or the dash when it cannot be read: Intl throws a RangeError on an invalid date (a
 * year after 9999, which Carbon writes without its sign), which would crash the whole page. Every API date goes through it.
 */
export function dateOrDash(iso: string, format: (date: Date) => string) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? NO_DATA : format(date)
}

/** "2026.11.20.", an API date's Budapest day (or the dash): fits a pill on one line. */
export function shortDate(iso: string) {
  return dateOrDash(iso, budapestDay)
}

/** The Budapest day of a moment, as the game, the overview and the rank shop count days: "2026.11.20.". */
export function budapestDay(date: Date) {
  return `${dayParts.format(date).replaceAll('-', '.')}.`
}

/** The Budapest day written out: "2026. október 16." ("Csatlakozott"). */
export function budapestLongDay(date: Date) {
  return longDay.format(date)
}

/** The Budapest day and time: "2026. nov. 14. 4:30" (a punishment's "Kapta"). */
export function budapestDayAndTime(date: Date) {
  return dayAndTime.format(date)
}

/** The Budapest clock, 24-hour: "18:00" (a season's end). */
export function budapestClock(date: Date) {
  return clock.format(date)
}

/** Today in Budapest, as a local-midnight Date with that year, month and day. */
function serverToday(now: Date) {
  const parts = dayParts.formatToParts(now)
  const part = (type: 'year' | 'month' | 'day') => Number(parts.find((entry) => entry.type === type)?.value)
  return new Date(part('year'), part('month') - 1, part('day'))
}

/** The week's days, Monday first: short for the streak boxes and the chart, whole for screen readers and the tooltip. */
export const DAY_SHORT = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V']
export const DAY_NAMES = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap']

/** Today's place in the server's week at `moment` (Budapest days, like RuneActivity's), Monday first (0-6). */
export function serverTodayIndex(moment: Date) {
  return (serverToday(moment).getDay() + 6) % 7
}

/** The dates of the server's week at `moment`, Monday first, at local midnight. */
export function serverWeek(moment: Date) {
  const today = serverToday(moment)
  const monday = today.getDate() - serverTodayIndex(moment)
  return Array.from({ length: 7 }, (_, index) => new Date(today.getFullYear(), today.getMonth(), monday + index))
}

/** Every count on the site (runes, players, Discord members): "12 500". */
export const countFormat = new Intl.NumberFormat('hu-HU')
