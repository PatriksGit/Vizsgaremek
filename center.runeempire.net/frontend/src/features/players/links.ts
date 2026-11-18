/** Where a profile's back link leads, and what it says. Sent as router state by the link that opened the profile. */
export type ProfileBack = { to: string; label: string }

/** A profile opened straight from the address (or a reload) goes back to the search. */
const TO_SEARCH: ProfileBack = { to: '/jatekosok', label: 'Vissza a kereséshez' }

/** A player's profile page. */
export function profilePath(name: string) {
  return `/jatekosok/${encodeURIComponent(name)}`
}

/** The back link from the router state, if it is a same-site path ("//" would leave the site); else to the search. */
export function profileBack(state: unknown): ProfileBack {
  const back = (state as { back?: Partial<ProfileBack> } | null)?.back
  if (typeof back?.to === 'string' && typeof back.label === 'string' && back.to.startsWith('/') && !back.to.startsWith('//')) {
    return { to: back.to, label: back.label }
  }
  return TO_SEARCH
}
