import { faClockRotateLeft, faUsers } from '@fortawesome/free-solid-svg-icons'

import { useManagementPresence } from '@/features/management/api'

import { MANAGEMENT_NAV, MANAGEMENT_PAGES, type NavItem } from './nav'

/**
 * The Management group (owner, 2026-11-26): its tools, so a new one is one more row here. The group's
 * header opens and closes it like Rúnák; the hub (/management) is the tools' "Vissza a Managementhez".
 */
export const MANAGEMENT_GROUP: NavItem = {
  label: MANAGEMENT_NAV.label,
  icon: MANAGEMENT_NAV.icon,
  to: MANAGEMENT_NAV.to,
  children: [
    { label: 'Játékosok', icon: faUsers, to: MANAGEMENT_PAGES.players },
    { label: 'Napló', icon: faClockRotateLeft, to: MANAGEMENT_PAGES.log },
  ],
}

/**
 * The sidebar's groups that only some players see (owner's idea, 2026-11-26), after nav.ts's NAV (the menu
 * everyone sees, which stays the one source for the phone tab bar). Today only Management, while the grant
 * is live (useManagementPresence: a peek that never slides it).
 */
export function useProtectedNav(): NavItem[] {
  const managementPresent = useManagementPresence()
  return managementPresent ? [MANAGEMENT_GROUP] : []
}
