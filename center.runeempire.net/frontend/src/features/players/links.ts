/**
 * Where a profile's back link leads, and what it says. Sent as router state by the link that opened the profile; `back`
 * is that page's own back link when it is a profile too, so a chain of friends leads back to the search with its ?q=
 * (review 2026-11-23, ranks-players K2).
 */
export type ProfileBack = { to: string; label: string; back?: ProfileBack }

/** A profile opened straight from the address (or a reload) goes back to the search. */
const TO_SEARCH: ProfileBack = { to: '/jatekosok', label: 'Vissza a kereséshez' }

/** A player's profile page. */
export function profilePath(name: string) {
  return `/jatekosok/${encodeURIComponent(name)}`
}

/** How many profiles back a chain is kept; a longer one is cut there (its last step goes to the search). */
const MAX_BACK_STEPS = 20

/** The back link from the router state, if it is a same-site path; else to the search. */
export function profileBack(state: unknown): ProfileBack {
  return sameSiteBack((state as { back?: unknown } | null)?.back, MAX_BACK_STEPS) ?? TO_SEARCH
}

/**
 * A path on this site: "//host" and "/\host" would leave it (react-router reads both as an absolute URL, like the
 * browser does).
 */
const isSitePath = (to: string) => to.startsWith('/') && !/^\/[\\/]/.test(to)

/** A back link whose every step (at most `steps`) is a same-site path, or null. */
function sameSiteBack(value: unknown, steps: number): ProfileBack | null {
  const back = value as Partial<ProfileBack> | null | undefined
  if (steps <= 0 || typeof back?.to !== 'string' || typeof back.label !== 'string' || !isSitePath(back.to)) return null
  const before = sameSiteBack(back.back, steps - 1)
  return before ? { to: back.to, label: back.label, back: before } : { to: back.to, label: back.label }
}
