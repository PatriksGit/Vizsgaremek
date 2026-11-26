import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useRef, useState } from 'react'
import { Outlet, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { Panel } from '@/components/app/Panel'
import { site } from '@/config/site'
import { ApiError, formMessage } from '@/lib/api'
import { enterAfter } from '@/lib/motion'

import { GOOGLE_REDIRECT_URL, useManagementMe } from './api'
import { errorText, isEmailAddress } from './wording'

/**
 * /management (owner, 2026-11-23: no login card, and no full reload like the
 * other pages). The menu is a router link to here. Signed in: the dashboard
 * at once. Signed out: on to Google (the only full-page navigation).
 * After a failed sign-in the backend adds ?error=<code> (and ?email= for a
 * refused address): a toast and back home, never an automatic redirect, so a
 * refusal cannot loop.
 */
export function ManagementPage() {
  const [params] = useSearchParams()
  // A refused sign-in never shows this page: no /me request, no "Betöltés…", straight home with a toast (owner, 2026-11-23).
  const refused = params.has('error')
  const me = useManagementMe({ enabled: !refused })
  // Fresh when the page opened (the menu's answer): decided once, so the data turning stale later does not hide the page.
  const [freshOnArrival] = useState(me.data !== undefined && !me.isStale)

  if (refused) return <SignInError errorCode={params.get('error')} email={params.get('email')} />

  const signedIn = (me.isFetchedAfterMount || freshOnArrival) && !me.isError && me.data?.signed_in === true

  return (
    <div className="mx-auto flex w-full max-w-220 flex-col gap-6 lg:mt-4">
      {/* Each page under the frame names itself; only the frame's own states use this one (one <title> at a time). */}
      {!signedIn && <title>{`Management | ${site.name}`}</title>}
      {/*
       * Gated on isFetchedAfterMount, never isPending (see the Queries rule): a cached answer from an
       * earlier visit (e.g. before "Kilépés a managementből", or a grant that ran out) must not show the
       * dashboard for a moment before this visit's answer forwards to Google (owner, 2026-11-23).
       */}
      {!(me.isFetchedAfterMount || freshOnArrival) ? (
        <Loading />
      ) : me.isError || !me.data ? (
        <FailedCard error={me.error} />
      ) : me.data.signed_in ? (
        // The hub or one tool's page (App.tsx's children of /management): all behind this one sign-in flow.
        <Outlet />
      ) : (
        <ToGoogle />
      )}
    </div>
  )
}

/**
 * While /me answers on a direct load (a bookmark, a refresh): nothing yet, not even skeletons -- the
 * page appears only once it is sure there is a grant; without one the browser goes to Google (owner,
 * 2026-11-23). From the menu the answer is already there (useOpenManagement).
 */
function Loading() {
  return <span role="status" className="sr-only">Betöltés…</span>
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

/**
 * A failed sign-in (owner, 2026-11-23: no error page): a toast with the reason,
 * then home. Never an automatic retry, so a refusal cannot loop.
 */
function SignInError({ errorCode, email }: { errorCode: string | null; email: string | null }) {
  const navigate = useNavigate()
  // StrictMode runs the effect twice in development: one toast, one navigation.
  const shown = useRef(false)

  useEffect(() => {
    if (shown.current) return
    shown.current = true
    const address = errorCode === 'management.not_allowed' && email !== null && isEmailAddress(email) ? email : null
    toast.error(errorText(errorCode), {
      id: 'management-sign-in',
      description: address ? `Ezzel a címmel próbáltad: ${address}` : undefined,
    })
    // quiet: home without the page-load build-up, so a refusal does not look like a fresh login (owner, 2026-11-23).
    navigate('/', { replace: true, state: { quiet: true } })
  }, [errorCode, email, navigate])

  return null
}

/**
 * The grant could not be read (a 403 without the permission, the server down): the text, no retry button; a refresh asks again.
 * A management code gets its own text; anything else (a timeout, no connection, a 5xx) the app's usual message (review K1).
 */
function FailedCard({ error }: { error: unknown }) {
  const code = error instanceof ApiError ? (error.code ?? (error.status === 429 ? 'too_many_requests' : null)) : null
  return (
    <>
      <h1 className="sr-only">Management</h1>
      <Panel as="section" style={enterAfter(50)} className="content-in">
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5 size-4 flex-none" aria-hidden="true" />
          <p className="font-semibold">{errorText(code, formMessage(error))}</p>
        </div>
      </Panel>
    </>
  )
}
