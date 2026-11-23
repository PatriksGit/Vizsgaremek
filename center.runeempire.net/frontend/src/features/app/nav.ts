import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  faClockRotateLeft,
  faCoins,
  faHatWizard,
  faHouse,
  faRightLeft,
  faUser,
  faUsers,
  faUserTie,
} from '@fortawesome/free-solid-svg-icons'
import { matchPath } from 'react-router'

export type NavLinkItem = {
  label: string
  /** A solid Font Awesome icon: the menu's one icon family (owner, 2026-11-13). */
  icon: IconDefinition
  to: string
  /** The faint line under the label on its group's page (SectionPage). */
  description?: string
  /** Not built yet: shown faded, not clickable, marked "Hamarosan". */
  comingSoon: boolean
}

export type NavItem = NavLinkItem & {
  /** A group in the sidebar that opens to these pages; on the phone tab bar the item links to its own `to`. */
  children?: NavLinkItem[]
}

/** The account settings: in the menu of the player card at the bottom of the sidebar, on phones the tab bar's last tab. */
export const ACCOUNT_NAV: NavLinkItem = { label: 'Fiók', icon: faUser, to: '/beallitasok', comingSoon: false }

/**
 * The management page (owner, 2026-11-23: faUserTie): only for can_manage, in the sidebar's account menu
 * above Beállítások, on phones a row on Beállítások. Both links ask first (management/api.ts useOpenManagement).
 */
export const MANAGEMENT_NAV: NavLinkItem = { label: 'Management', icon: faUserTie, to: '/management', comingSoon: false }

/**
 * The logged-in pages: the one list the sidebar and the phone tab bar are
 * both built from. For now only these (owner, 2026-11-13): the runes with
 * sending and their log, the ranks, and the players. No rune buying for real
 * money (owner, 2026-11-22): it needs a company, so it is out of the exam and
 * hidden until then.
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

/** Whether the address is a page under this one, such as a player's profile under /jatekosok. The overview has none. */
function isUnder(to: string, pathname: string) {
  return to !== '/' && matchPath({ path: to, end: false }, pathname) !== null
}

/** Whether the current page is this item or a page under it (a group's pages live under the group's path). */
export function isActive(item: NavItem, pathname: string) {
  return isPage(item.to, pathname) || isUnder(item.to, pathname)
}

/**
 * Whether the page is one the account menu leads to: Beállítások, or Management, which phones reach
 * from Beállítások. Marks the sidebar's gear and the phone Fiók tab (review 2026-11-23 app-shell K3).
 */
export function isAccountArea(pathname: string) {
  return isPage(ACCOUNT_NAV.to, pathname) || isPage(MANAGEMENT_NAV.to, pathname)
}
