import { NO_DATA } from '@/lib/noData'

/**
 * A field the account does not have (no e-mail, never joined so no IP): the
 * site's dash, but read as "nincs" -- components/app/NoData says "most nem
 * érhető el", which would be wrong here: nothing failed to load.
 */
export function None() {
  return (
    <>
      {NO_DATA}
      <span className="sr-only"> (nincs)</span>
    </>
  )
}
