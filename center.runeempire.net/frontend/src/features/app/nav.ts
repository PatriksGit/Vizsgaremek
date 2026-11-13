import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  faCartShopping,
  faClockRotateLeft,
  faCoins,
  faHatWizard,
  faHouse,
  faRightLeft,
  faUser,
  faUsers,
} from '@fortawesome/free-solid-svg-icons'
import { matchPath } from 'react-router'

export type NavLinkItem = {
  label: string
  /** A solid Font Awesome icon: the menu's one icon family (owner, 2026-11-13). */
  icon: IconDefinition
  to: string
  /** The faint line under the label in a dropdown. */
  description?: string
  /** Not built yet: shown faded, not clickable, with a "Hamarosan" tooltip. */
  comingSoon: boolean
}

export type NavItem = NavLinkItem & {
  /** A group in the sidebar that opens to these pages; on the phone tab bar the item links to its own `to`. */
  children?: NavLinkItem[]
}

/** The account settings: the gear beside the player in the sidebar, on phones the tab bar's last tab. */
export const ACCOUNT_NAV: NavLinkItem = { label: 'Fiók', icon: faUser, to: '/beallitasok', comingSoon: false }

/**
 * The logged-in pages: the one list the sidebar and the phone tab bar are
 * both built from. For now only these (owner, 2026-11-13): the runes with
 * buying, sending and their log, the ranks, and the players.
 */
export const NAV: NavItem[] = [
  { label: 'Főoldal', icon: faHouse, to: '/', comingSoon: false },
  {
    label: 'Rúnák',
    // The coin is the runes' icon everywhere on the site (owner, 2026-11-13).
    icon: faCoins,
    to: '/runak',
    comingSoon: false,
    children: [
      {
        label: 'Vásárlás',
        icon: faCartShopping,
        to: '/runak/vasarlas',
        description: 'Rúnacsomagok a szerver pénzéhez',
        comingSoon: false,
      },
      {
        label: 'Átutalás',
        icon: faRightLeft,
        to: '/runak/atutalas',
        description: 'Rúnák küldése egy másik játékosnak',
        comingSoon: true,
      },
      { label: 'Napló', icon: faClockRotateLeft, to: '/runak/naplo', description: 'Hova mentek a rúnáid', comingSoon: true },
    ],
  },
  { label: 'Rangok', icon: faHatWizard, to: '/rangok', comingSoon: false },
  { label: 'Játékosok', icon: faUsers, to: '/jatekosok', comingSoon: false },
]

/** The phone tab bar, five tabs in thumb reach: every menu item, then the account. */
export const TAB_NAV: NavItem[] = [...NAV, ACCOUNT_NAV]

/** Whether the address is this page, matched as the router does (any case, a trailing slash allowed). */
export function isPage(to: string, pathname: string) {
  return matchPath(to, pathname) !== null
}

/** Whether the current page is this item, or one of the pages in its group. */
export function isActive(item: NavItem, pathname: string) {
  return isPage(item.to, pathname) || (item.children?.some((child) => isPage(child.to, pathname)) ?? false)
}
