import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  faArrowRightArrowLeft,
  faClockRotateLeft,
  faCrown,
  faGem,
  faHourglassHalf,
  faHouse,
  faMagnifyingGlass,
  faStore,
  faTrophy,
  faUsers,
} from '@fortawesome/free-solid-svg-icons'

import { features, type Feature } from '@/config/features'

export type NavItem = {
  label: string
  icon: IconDefinition
  to: string
  /** The page's switch in config/features.ts; none means always built. */
  feature?: Feature
}

export type NavGroup = {
  title: string
  /** Shown on the group's own row once it opens into a submenu. */
  icon: IconDefinition
  items: NavItem[]
}

/**
 * The logged-in pages, grouped as the sidebar shows them. The account
 * settings are not here: the player card at the bottom of the sidebar leads there.
 */
export const APP_NAV: NavGroup[] = [
  { title: 'Áttekintés', icon: faHouse, items: [{ label: 'Áttekintés', icon: faHouse, to: '/' }] },
  {
    title: 'Bolt',
    icon: faStore,
    items: [
      { label: 'Rangok', icon: faCrown, to: '/rangok', feature: 'ranks' },
      { label: 'Rúnák', icon: faGem, to: '/runak', feature: 'runes' },
      { label: 'Kitiltás-csökkentés', icon: faHourglassHalf, to: '/kitiltas-csokkentes', feature: 'banReduction' },
    ],
  },
  {
    title: 'Átutalás',
    icon: faArrowRightArrowLeft,
    items: [{ label: 'Átutalás', icon: faArrowRightArrowLeft, to: '/atutalas', feature: 'transfer' }],
  },
  {
    title: 'Közösség',
    icon: faUsers,
    items: [
      { label: 'Játékosok', icon: faMagnifyingGlass, to: '/jatekosok', feature: 'players' },
      { label: 'Ranglista', icon: faTrophy, to: '/ranglista', feature: 'leaderboard' },
    ],
  },
  { title: 'Napló', icon: faClockRotateLeft, items: [{ label: 'Napló', icon: faClockRotateLeft, to: '/naplo', feature: 'log' }] },
]

export function isBuilt(item: NavItem) {
  return item.feature === undefined || features[item.feature]
}
