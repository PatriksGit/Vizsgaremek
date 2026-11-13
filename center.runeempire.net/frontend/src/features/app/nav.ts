import {
  ArrowLeftRight,
  Crown,
  Gavel,
  Gem,
  History,
  House,
  type LucideIcon,
  Search,
  ShieldHalf,
  ShoppingBag,
  User,
  Users,
} from 'lucide-react'

export type NavLinkItem = {
  label: string
  icon: LucideIcon
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
export const ACCOUNT_NAV: NavLinkItem = { label: 'Fiók', icon: User, to: '/beallitasok', comingSoon: false }

const LOG: NavLinkItem = { label: 'Napló', icon: History, to: '/naplo', comingSoon: true }

/** The logged-in pages: the one list the sidebar and the phone tab bar are both built from. */
export const NAV: NavItem[] = [
  { label: 'Áttekintés', icon: House, to: '/', comingSoon: false },
  {
    // A group only: its pages are the player's own history; the settings sit behind the gear.
    label: 'Fiók',
    icon: User,
    to: ACCOUNT_NAV.to,
    comingSoon: false,
    children: [LOG, { label: 'Átutalás', icon: ArrowLeftRight, to: '/atutalas', comingSoon: true }],
  },
  {
    label: 'Bolt',
    icon: ShoppingBag,
    to: '/bolt',
    comingSoon: false,
    children: [
      { label: 'Rangok', icon: Crown, to: '/rangok', description: 'Rangok és az előnyeik', comingSoon: false },
      { label: 'Rúna-feltöltés', icon: Gem, to: '/runak', description: 'Rúnacsomagok a szerver pénzéhez', comingSoon: false },
    ],
  },
  {
    label: 'Közösség',
    icon: Users,
    to: '/kozosseg',
    comingSoon: false,
    children: [
      {
        label: 'Játékoskereső',
        icon: Search,
        to: '/jatekosok',
        description: 'Bármelyik játékos adatlapja',
        comingSoon: false,
      },
      { label: 'Szankciók', icon: Gavel, to: '/szankciok', description: 'Kitiltások és némítások', comingSoon: false },
      { label: 'Csapat', icon: ShieldHalf, to: '/csapat', description: 'Akik a szervert viszik', comingSoon: false },
    ],
  },
]

/** The phone tab bar, five tabs in thumb reach: the overview, the shop, the community, the log and the account. */
export const TAB_NAV: NavItem[] = [NAV[0], NAV[2], NAV[3], LOG, ACCOUNT_NAV]

/** Whether the current page is this item, or one of the pages in its group. */
export function isActive(item: NavItem, pathname: string) {
  return item.to === pathname || (item.children?.some((child) => child.to === pathname) ?? false)
}

/** Where a page lives, if it is built; for links outside the menu, such as the overview's tiles. */
export function builtPage(to: string) {
  const items = NAV.flatMap((item) => [item, ...(item.children ?? [])])
  return items.some((item) => item.to === to && !item.comingSoon) ? to : undefined
}
