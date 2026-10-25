import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  faArrowRightArrowLeft,
  faClockRotateLeft,
  faCrown,
  faGavel,
  faGem,
  faHouse,
  faMagnifyingGlass,
  faShieldHalved,
  faStore,
  faUser,
  faUsers,
} from '@fortawesome/free-solid-svg-icons'

export type NavLinkItem = {
  label: string
  icon: IconDefinition
  to: string
  /** The faint line under the label in a dropdown. */
  description?: string
  /** Not built yet: shown faded, not clickable, with a "Hamarosan" tooltip. */
  comingSoon: boolean
}

export type NavItem = NavLinkItem & {
  /** Opens a dropdown on the desktop navbar; on the phone tab bar the item links to its own `to`. */
  children?: NavLinkItem[]
  /** Left out of the phone tab bar, which only has room for five. */
  desktopOnly?: boolean
}

/** The logged-in pages: the one list the desktop navbar and the phone tab bar are both built from. */
export const NAV: NavItem[] = [
  { label: 'Áttekintés', icon: faHouse, to: '/', comingSoon: false },
  {
    label: 'Bolt',
    icon: faStore,
    to: '/bolt',
    comingSoon: false,
    children: [
      { label: 'Rangok', icon: faCrown, to: '/rangok', description: 'Rangok és az előnyeik', comingSoon: false },
      { label: 'Rúnák', icon: faGem, to: '/runak', description: 'Rúnacsomagok a szerver pénzéhez', comingSoon: false },
    ],
  },
  {
    label: 'Közösség',
    icon: faUsers,
    to: '/kozosseg',
    comingSoon: false,
    children: [
      {
        label: 'Játékoskereső',
        icon: faMagnifyingGlass,
        to: '/jatekosok',
        description: 'Bármelyik játékos adatlapja',
        comingSoon: false,
      },
      { label: 'Szankciók', icon: faGavel, to: '/szankciok', description: 'Kitiltások és némítások', comingSoon: false },
      { label: 'Csapat', icon: faShieldHalved, to: '/csapat', description: 'Akik a szervert viszik', comingSoon: false },
    ],
  },
  { label: 'Átutalás', icon: faArrowRightArrowLeft, to: '/atutalas', comingSoon: true, desktopOnly: true },
  { label: 'Napló', icon: faClockRotateLeft, to: '/naplo', comingSoon: true },
]

/** The account settings: on the desktop behind the avatar, on phones the tab bar's last tab. */
export const ACCOUNT_NAV: NavLinkItem = { label: 'Fiók', icon: faUser, to: '/beallitasok', comingSoon: false }

/** The phone tab bar: every item that fits, then the account. */
export const TAB_NAV: NavItem[] =[...NAV.filter((item) => !item.desktopOnly), ACCOUNT_NAV]

/** Whether the current page is this item, or one of the pages in its dropdown. */
export function isActive(item: NavItem, pathname: string) {
  return item.to === pathname || (item.children?.some((child) => child.to === pathname) ?? false)
}

/** Where a page lives, if it is built; for links outside the menu, such as the overview's tiles. */
export function builtPage(to: string) {
  const items = NAV.flatMap((item) => [item, ...(item.children ?? [])])
  return items.some((item) => item.to === to && !item.comingSoon) ? to : undefined
}
