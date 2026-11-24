import { NO_DATA } from '@/lib/noData'

/** The dash in a value's own place, with its reason for screen readers. */
export function NoData() {
  return (
    <>
      {NO_DATA}
      <span className="sr-only"> (most nem érhető el)</span>
    </>
  )
}
