import { faRightFromBracket } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { site } from '@/config/site'
import { logout } from '@/features/auth/api'
import { useAuth } from '@/features/auth/authContext'
import { formMessage } from '@/features/auth/errors'
import { FormAlert } from '@/features/auth/FormAlert'

/** Where a player lands after logging in. Placeholder until the account pages exist. */
export function HomePage() {
  const { account, setAccount } = useAuth()
  const [error, setError] = useState<string>()
  const [leaving, setLeaving] = useState(false)

  async function handleLogout() {
    setError(undefined)
    setLeaving(true)
    try {
      await logout()
      // Logged out: the home page sends the player to the login page.
      setAccount(null)
    } catch (failure) {
      setError(formMessage(failure))
      setLeaving(false)
    }
  }

  return (
    <main
      className="relative isolate flex min-h-dvh items-center justify-center bg-background bg-cover bg-center px-4 py-10"
      style={site.authBackgroundUrl ? { backgroundImage: `url(${site.authBackgroundUrl})` } : undefined}
    >
      <title>{`Fiókom | ${site.name}`}</title>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgb(0_0_0/0.25),rgb(0_0_0/0.65))]"
      />

      <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-3xl border border-white/10 bg-black/55 p-8 text-center shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8)] backdrop-blur-xl">
        <img src={site.logoUrl} alt="" width={64} height={64} className="size-16" />
        <div>
          <h1 className="font-heading text-3xl text-foreground">Szia, {account?.display_name}!</h1>
          <p className="mt-2 text-muted-foreground">Be vagy jelentkezve. A fiókoldalad hamarosan itt lesz.</p>
        </div>
        <FormAlert message={error} />
        <Button variant="secondary" onClick={handleLogout} disabled={leaving} className="h-10 rounded-lg px-5">
          <FontAwesomeIcon icon={faRightFromBracket} aria-hidden="true" />
          {leaving ? 'Kijelentkezés…' : 'Kijelentkezés'}
        </Button>
      </div>
    </main>
  )
}
