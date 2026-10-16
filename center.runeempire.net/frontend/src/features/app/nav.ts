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

type NavItem = {
  label: string
  icon: IconDefinition
  /** Left out while the page is not built yet: the item shows as coming soon. */
  to?: string
}

/** The logged-in pages, grouped as the sidebar shows them. */
export const APP_NAV: { title: string; items: NavItem[] }[] = [
  { title: 'Áttekintés', items: [{ label: 'Áttekintés', icon: faHouse, to: '/' }] },
  {
    title: 'Bolt',
    items: [
      { label: 'Rangok', icon: faCrown },
      { label: 'Rúnák', icon: faGem },
    ],
  },
  {
    title: 'Közösség',
    items: [
      { label: 'Játékosok', icon: faMagnifyingGlass },
      { label: 'Ranglista', icon: faTrophy },
    ],
  },
  {
    title: 'Fiók',
    items: [
      { label: 'Napló', icon: faClockRotateLeft },
      { label: 'Beállítások', icon: faGear, to: '/beallitasok' },
    ],
  },
]
