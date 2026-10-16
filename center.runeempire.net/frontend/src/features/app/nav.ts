import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  faClockRotateLeft,
  faCrown,
  faGear,
  faGem,
  faHouse,
  faMagnifyingGlass,
  faTrophy,
} from '@fortawesome/free-solid-svg-icons'

import { features, type Feature } from '@/config/features'

type NavItem = {
  label: string
  icon: IconDefinition
  to: string
  /** The page's switch in config/features.ts; none means always built. */
  feature?: Feature
}

/** The logged-in pages, grouped as the sidebar shows them. */
export const APP_NAV: { title: string; items: NavItem[] }[] = [
  { title: 'Áttekintés', items: [{ label: 'Áttekintés', icon: faHouse, to: '/' }] },
  {
    title: 'Bolt',
    items: [
      { label: 'Rangok', icon: faCrown, to: '/rangok', feature: 'ranks' },
      { label: 'Rúnák', icon: faGem, to: '/runak', feature: 'runes' },
    ],
  },
  {
    title: 'Közösség',
    items: [
      { label: 'Játékosok', icon: faMagnifyingGlass, to: '/jatekosok', feature: 'players' },
      { label: 'Ranglista', icon: faTrophy, to: '/ranglista', feature: 'leaderboard' },
    ],
  },
  {
    title: 'Fiók',
    items: [
      { label: 'Napló', icon: faClockRotateLeft, to: '/naplo', feature: 'log' },
      { label: 'Beállítások', icon: faGear, to: '/beallitasok', feature: 'settings' },
    ],
  },
]

export function isBuilt(item: NavItem) {
  return item.feature === undefined || features[item.feature]
}
