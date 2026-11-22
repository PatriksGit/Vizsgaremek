import { faLock, faRightFromBracket } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { toast } from 'sonner'

import { panelLook } from '@/components/app/Panel'
import { PlayerHead } from '@/components/app/PlayerHead'
import { Button } from '@/components/ui/button'
import { site } from '@/config/site'
import type { Account } from '@/features/auth/api'
import { formMessage } from '@/features/auth/errors'
import { useAccount, useLogout } from '@/features/auth/queries'
import { NO_DATA } from '@/features/home/stats'
import { enterAfter } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { PasswordCard } from './PasswordCard'
import { TwoFactorCard } from './TwoFactorCard'

/**
 * Beállítások (the owner's design "Asztali/Mobil – Beállítások"): the account's
 * details, the password change and 2FA. No Munkamenetek card (owner, 2026-11-22).
 */
export function AccountPage() {
  // RequireAccount renders this page only for a logged-in player.
  const account = useAccount().data!

  return (
    <div className="mx-auto flex w-full max-w-220 flex-col gap-6">
      <title>{`Beállítások | ${site.name}`}</title>
      <h1 className="sr-only">Beállítások</h1>

      <AccountDetailsCard account={account} />
      <PasswordCard username={account.username} enterDelay={200} />
      <TwoFactorCard enabled={account.two_factor_enabled} enterDelay={300} />
      <LogoutButton />
    </div>
  )
}

/** Fiókadatok: the name and the e-mail address, which only staff can change. */
function AccountDetailsCard({ account }: { account: Account }) {
  return (
    <section aria-labelledby="account-title" style={enterAfter(100)} className={cn(panelLook, 'content-in overflow-hidden p-0')}>
      <div className="p-5 md:p-6">
        <h2 id="account-title" className="font-heading text-lg font-bold text-foreground md:text-xl">
          Fiókadatok
        </h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2 sm:gap-6">
          <div className="flex min-w-0 items-center gap-3">
            <PlayerHead name={account.display_name} className="size-10 flex-none" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-xs font-semibold text-faint">Játékosnév</dt>
              <dd className="truncate text-[15px] font-bold text-foreground">{account.display_name}</dd>
            </div>
          </div>
          <div className="flex min-w-0 flex-col justify-center gap-0.5">
            <dt className="text-xs font-semibold text-faint">E-mail cím</dt>
            <dd className="truncate text-[15px] font-bold text-foreground" title={account.email ?? undefined}>
              {account.email ?? <span className="text-muted-foreground">{NO_DATA}</span>}
            </dd>
          </div>
        </dl>
      </div>
      <footer className="flex items-center gap-2 border-t border-border bg-sunken/60 px-5 py-3 text-xs text-faint md:px-6">
        <FontAwesomeIcon icon={faLock} aria-hidden="true" className="size-3.5 flex-none" />
        Ezeket az adatokat csak adminisztrátor módosíthatja.
      </footer>
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
      style={enterAfter(400)}
      className="content-in h-11 self-start px-4 hover:border-redstone/40 hover:bg-redstone/10 hover:text-redstone md:hidden"
    >
      <FontAwesomeIcon icon={faRightFromBracket} aria-hidden="true" />
      {logout.isPending ? 'Kijelentkezés…' : 'Kijelentkezés'}
    </Button>
  )
}
