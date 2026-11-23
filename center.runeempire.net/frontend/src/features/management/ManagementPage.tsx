import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { Panel } from '@/components/app/Panel'
import { Button, buttonVariants } from '@/components/ui/button'
import { site } from '@/config/site'
import { formMessage } from '@/features/auth/errors'
import { ApiError } from '@/lib/api'
import { enterAfter } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { GOOGLE_REDIRECT_URL, useManagementLogout, useManagementMe } from './api'
import { errorText, isEmailAddress } from './wording'

/**
 * /management (owner, 2026-11-23: no login card). The menu links to the
 * backend's Google redirect, which comes back here straight away when the grant
 * is still live. Signed in: the dashboard. Signed out: on to Google at once.
 * After a failed sign-in the backend adds ?error=<code> (and ?email= for a
 * refused address): an error screen, never an automatic redirect, so a refusal
 * cannot loop.
 */
export function ManagementPage() {
  const me = useManagementMe()
  const [params] = useSearchParams()

  return (
    <div className="mx-auto flex w-full max-w-220 flex-col gap-6 lg:mt-4">
      <title>{`Management | ${site.name}`}</title>
      {/* Gated on isFetched, never isPending (see the Queries rule). */}
      {!me.isFetched ? (
        <p role="status" className="text-muted-foreground">
          Betöltés…
        </p>
      ) : !me.data ? (
        <FailedCard error={me.error} />
      ) : me.data.signed_in ? (
        <SignedIn email={me.data.email} />
      ) : params.has('error') ? (
        <SignInError errorCode={params.get('error')} email={params.get('email')} />
      ) : (
        <ToGoogle />
      )}
    </div>
  )
}

/** Signed out without an error: on to the Google redirect. replace: the back button does not land here again. */
function ToGoogle() {
  // StrictMode runs the effect twice in development: two navigations would race over Socialite's state.
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    window.location.replace(GOOGLE_REDIRECT_URL)
  }, [])

  return (
    <p role="status" className="text-muted-foreground">
      Átirányítás a Google-belépéshez…
    </p>
  )
}

function SignInError({ errorCode, email }: { errorCode: string | null; email: string | null }) {
  const address = errorCode === 'management.not_allowed' && email !== null && isEmailAddress(email) ? email : null

  return (
    <>
      <h1 className="sr-only">Management</h1>
      <Panel as="section" aria-labelledby="management-login" style={enterAfter(50)} className="content-in flex flex-col gap-5">
        <h2 id="management-login" className="font-heading text-2xl font-bold text-foreground">
          Management belépés
        </h2>
        <ErrorNote text={errorText(errorCode)} detail={address} />
        <div className="flex flex-wrap items-center gap-3">
          {/* A plain link, not a Base UI Button: the sign-in is a full-page navigation to the backend. */}
          <a href={GOOGLE_REDIRECT_URL} className={cn(buttonVariants({ size: 'lg' }), 'h-11 px-4')}>
            Újrapróbálás
          </a>
          <Link to="/" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-11 px-4')}>
            Vissza a főoldalra
          </Link>
        </div>
      </Panel>
    </>
  )
}

function ErrorNote({ text, detail }: { text: string; detail: string | null }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
      <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5 size-4 flex-none" aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-semibold">{text}</p>
        {detail && <p className="break-words">{`Ezzel a címmel próbáltad: ${detail}`}</p>}
      </div>
    </div>
  )
}

/** The grant could not be read (a 403 without the permission, the server down): the text, no retry button; a refresh asks again. */
function FailedCard({ error }: { error: unknown }) {
  const code = error instanceof ApiError ? (error.code ?? (error.status === 429 ? 'too_many_requests' : null)) : null
  return (
    <>
      <h1 className="sr-only">Management</h1>
      <Panel as="section" style={enterAfter(50)} className="content-in">
        <ErrorNote text={errorText(code)} detail={null} />
      </Panel>
    </>
  )
}

function SignedIn({ email }: { email: string }) {
  const logout = useManagementLogout()

  return (
    <>
      <h1 style={enterAfter(50)} className="content-in font-heading text-3xl font-bold text-foreground md:text-4xl">
        Management
      </h1>
      <Panel as="section" aria-label="Belépés" style={enterAfter(150)} className="content-in flex flex-wrap items-center gap-4">
        <p className="min-w-0 flex-1 basis-56 break-words text-foreground">{`Bejelentkezve: ${email}`}</p>
        <Button
          variant="outline"
          size="lg"
          onClick={() => logout.mutate(undefined, { onError: (error) => toast.error(formMessage(error)) })}
          disabled={logout.isPending}
          className="h-11 px-4"
        >
          Kilépés a managementből
        </Button>
      </Panel>
      <Panel as="section" aria-label="Kezelőeszközök" style={enterAfter(250)} className="content-in">
        <p className="text-muted-foreground">Itt lesznek majd a kezelési eszközök.</p>
      </Panel>
    </>
  )
}
