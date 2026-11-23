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

// Intl throws a RangeError on an invalid date: an API date goes through home stats.ts dateOrDash first (the dash instead).

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
export function serverToday(now = new Date()) {
  const part = (type: 'year' | 'month' | 'day') => Number(dayParts.formatToParts(now).find((entry) => entry.type === type)?.value)
  return new Date(part('year'), part('month') - 1, part('day'))
}

/** Every count on the site (runes, players, Discord members): "12 500". */
export const countFormat = new Intl.NumberFormat('hu-HU')
