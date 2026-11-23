import type { IconDefinition, IconName, IconPrefix } from '@fortawesome/fontawesome-svg-core'
import { faGoogle, faMicrosoft } from '@fortawesome/free-brands-svg-icons'
import { useQueryClient } from '@tanstack/react-query'

import type { Account } from '@/features/auth/api'
import { accountQueryKey } from '@/features/auth/queries'

/**
 * Writes the new 2FA state into the cached account, so the card switches at
 * once without asking /api/auth/me again.
 */
export function useSetTwoFactorEnabled() {
  const queryClient = useQueryClient()

  return (enabled: boolean) =>
    queryClient.setQueryData<Account | null>(accountQueryKey, (account) => (account ? { ...account, two_factor_enabled: enabled } : account))
}

/** The key in groups of four, easier to type into an app by hand (the app ignores the spaces). */
export function groupedKey(secret: string) {
  return secret.match(/.{1,4}/g)?.join(' ') ?? secret
}

/**
 * Proton's logo as a Font Awesome icon (owner, 2026-11-22: Font Awesome has
 * none). The path is Simple Icons' proton.svg (simple-icons 13.21.0, CC0-1.0),
 * on its 24x24 grid.
 */
const faProton: IconDefinition = {
  prefix: 'fac' as IconPrefix,
  iconName: 'proton' as IconName,
  icon: [
    24,
    24,
    [],
    '',
    'M2.474 17.75V24h4.401v-5.979c0-.582.232-1.14.645-1.551a2.204 2.204 0 0 1 1.556-.643h4.513a7.955 7.955 0 0 0 5.612-2.318 7.907 7.907 0 0 0 2.325-5.595 7.91 7.91 0 0 0-2.325-5.596A7.958 7.958 0 0 0 13.587 0H2.474v7.812h4.401V4.129h6.416c.995 0 1.951.394 2.656 1.097.704.7 1.1 1.653 1.101 2.646a3.742 3.742 0 0 1-1.101 2.648 3.766 3.766 0 0 1-2.656 1.097H8.627a6.158 6.158 0 0 0-4.352 1.795 6.133 6.133 0 0 0-1.801 4.338Z',
  ],
}

type AuthenticatorApp = { name: string; icon: IconDefinition; ios: string; android: string }

/**
 * The apps the setup suggests (owner, 2026-11-22: Google, Proton and one
 * more), each with its official store listing. Any TOTP app works.
 */
export const AUTHENTICATOR_APPS: AuthenticatorApp[] = [
  {
    name: 'Google Authenticator',
    icon: faGoogle,
    ios: 'https://apps.apple.com/app/google-authenticator/id388497605',
    android: 'https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2',
  },
  {
    name: 'Microsoft Authenticator',
    icon: faMicrosoft,
    ios: 'https://apps.apple.com/app/microsoft-authenticator/id983156458',
    android: 'https://play.google.com/store/apps/details?id=com.azure.authenticator',
  },
  {
    name: 'Proton Authenticator',
    icon: faProton,
    ios: 'https://apps.apple.com/app/proton-authenticator/id6741758667',
    android: 'https://play.google.com/store/apps/details?id=proton.android.authenticator',
  },
]
