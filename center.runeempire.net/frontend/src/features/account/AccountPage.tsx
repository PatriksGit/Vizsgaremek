import { faRightFromBracket } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { PagePlaceholder } from '@/features/app/PagePlaceholder'
import { formMessage } from '@/features/auth/errors'
import { useLogout } from '@/features/auth/queries'

export function AccountPage() {
  const logout = useLogout()

  return (
    <PagePlaceholder title="Beállítások">
      <p className="text-muted-foreground">
        Itt tudod majd megváltoztatni a jelszavad és bekapcsolni a kétlépcsős azonosítást.
      </p>
      {/* On phones the only way out: the avatar menu with its logout is a desktop thing. */}
      <Button
        variant="outline"
        size="lg"
        // Logged out: the guard sends the player to the login page.
        onClick={() => logout.mutate(undefined, { onError: (error) => toast.error(formMessage(error)) })}
        disabled={logout.isPending}
        className="h-11 px-4 hover:border-redstone/40 hover:bg-redstone/10 hover:text-redstone"
      >
        <FontAwesomeIcon icon={faRightFromBracket} aria-hidden="true" />
        {logout.isPending ? 'Kijelentkezés…' : 'Kijelentkezés'}
      </Button>
    </PagePlaceholder>
  )
}
