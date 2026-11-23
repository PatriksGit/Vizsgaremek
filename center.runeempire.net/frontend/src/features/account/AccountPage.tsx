import { faRightFromBracket, faShieldHalved } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { toast } from 'sonner'

import { panelLook } from '@/components/app/Panel'
import { PlayerHead } from '@/components/app/PlayerHead'
import { Button, buttonVariants } from '@/components/ui/button'
import { site } from '@/config/site'
import type { Account } from '@/features/auth/api'
import { formMessage } from '@/features/auth/errors'
import { useAccount, useLogout } from '@/features/auth/queries'
import { GOOGLE_REDIRECT_URL } from '@/features/management/api'
import { NO_DATA } from '@/features/home/stats'
import { enterAfter } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { PasswordRow } from './PasswordRow'
import { SettingsRow } from './SettingsRow'
import { TwoFactorRow } from './TwoFactorRow'

/**
 * Beállítások (owner, 2026-11-22: the modern account page pattern): the
 * player on top, then one Biztonság card with a row per way of logging in.
 */
export function AccountPage() {
  // RequireAccount renders this page only for a logged-in player.
  const account = useAccount().data!

  return (
    <div className="mx-auto flex w-full max-w-220 flex-col gap-6 lg:mt-4">
      <title>{`Beállítások | ${site.name}`}</title>
      <h1 style={enterAfter(50)} className="content-in font-heading text-3xl font-bold text-foreground md:text-4xl">
        Beállítások
      </h1>

      <ProfileCard account={account} />

      <section aria-labelledby="security-title" style={enterAfter(200)} className="content-in flex flex-col gap-3">
        <h2 id="security-title" className="font-heading text-xl font-bold text-foreground">
          Biztonság
        </h2>
        <div className={cn(panelLook, 'divide-y divide-border p-0')}>
          <PasswordRow username={account.username} />
          <TwoFactorRow enabled={account.two_factor_enabled} />
          {/* The sidebar's account menu is a desktop thing: phones reach the management page from here. */}
          {account.can_manage && (
            <div className="md:hidden">
              <SettingsRow
                id="management-title"
                icon={faShieldHalved}
                title="Management"
                description="A szerver kezelőfelülete, Google-fiókkal léphetsz be."
                action={
                  // A full-page link, like the sidebar's: the backend's Google redirect.
                  <a href={GOOGLE_REDIRECT_URL} className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                    Megnyitás
                  </a>
                }
              />
            </div>
          )}
        </div>
      </section>

      <LogoutButton />
    </div>
  )
}

/** The player: their head, name and own e-mail address. */
function ProfileCard({ account }: { account: Account }) {
  return (
    <section aria-label="Profil" style={enterAfter(100)} className={cn(panelLook, 'content-in flex items-center gap-4 md:gap-5')}>
      <PlayerHead name={account.display_name} className="size-14 flex-none md:size-16" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="truncate font-heading text-xl font-bold text-foreground md:text-2xl">{account.display_name}</p>
        <p className="truncate text-sm text-muted-foreground" title={account.email ?? undefined}>
          {account.email ?? NO_DATA}
        </p>
      </div>
    </section>
  )
}

/** On phones the only way out: the sidebar's account menu is a desktop thing. */
function LogoutButton() {
  const logout = useLogout()

  return (
    <Button
      variant="outline"
      size="lg"
      // Logged out: the guard sends the player to the login page.
      onClick={() => logout.mutate(undefined, { onError: (error) => toast.error(formMessage(error)) })}
      disabled={logout.isPending}
      style={enterAfter(300)}
      className="content-in h-11 self-start px-4 hover:border-redstone/40 hover:bg-redstone/10 hover:text-redstone md:hidden"
    >
      <FontAwesomeIcon icon={faRightFromBracket} aria-hidden="true" />
      {logout.isPending ? 'Kijelentkezés…' : 'Kijelentkezés'}
    </Button>
  )
}
