import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { ReactNode } from 'react'
import { Link, matchPath, useLocation } from 'react-router'

import { site } from '@/config/site'
import { enterAfter } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { AuthShowcase } from './AuthShowcase'
import { AuthTabs, type AuthMode } from './AuthTabs'
import { ForgotPasswordForm } from './ForgotPasswordForm'
import { useFromState } from './fromState'
import { LoginForm } from './LoginForm'
import { useAccount } from './queries'
import { RegisterForm } from './RegisterForm'
import { ServerBackdrop } from './ServerBackdrop'
import { quietLinkClass, slideTiming } from './styles'

const TITLES: Record<AuthMode, string> = { login: 'Belépés', register: 'Regisztráció', forgot: 'Elfelejtett jelszó' }

/** Matched like the routes themselves: /register/ and /Register open the registration form too. */
function modeFor(pathname: string): AuthMode {
  if (matchPath('/register', pathname)) return 'register'
  if (matchPath('/forgot-password', pathname)) return 'forgot'
  return 'login'
}

/**
 * Login, registration and the forgotten password on one glass card: the info
 * panel stays on the left, and the forms slide past each other on the right
 * (login on the left of the other two). Every form stays mounted, so
 * switching back and forth keeps what was typed.
 */
export function AuthPage() {
  const { pathname } = useLocation()
  const mode = modeFor(pathname)

  return (
    <div className="relative isolate flex min-h-dvh items-center justify-center bg-background px-4 py-10 sm:px-6">
      <title>{`${TITLES[mode]} | ${site.name}`}</title>
      <ServerBackdrop />

      <div className="card-rise glass grid w-full max-w-4xl overflow-hidden md:grid-cols-2">
        <AuthShowcase className="border-white/10 max-md:border-b md:border-r" />

        {/* The three forms share one grid cell, so the column is as tall as the tallest one.
            The entrance plays on this wrapper: the slides' own opacity drives the slide. */}
        <div className="content-in grid overflow-hidden" style={enterAfter(500)}>
          <FormSlide mode={mode} active={mode === 'login'} from="left">
            <LoginForm />
          </FormSlide>
          <FormSlide mode={mode} active={mode === 'register'} from="right">
            <RegisterForm />
          </FormSlide>
          <FormSlide mode={mode} active={mode === 'forgot'} from="right" header={<BackLink />}>
            <ForgotPasswordForm />
          </FormSlide>
        </div>
      </div>
    </div>
  )
}

type FormSlideProps = {
  mode: AuthMode
  active: boolean
  from: 'left' | 'right'
  /** What sits above the form: the Belépés/Regisztráció tabs unless given. */
  header?: ReactNode
  children: ReactNode
}

/**
 * One form with its tabs, centred in the slider. The inactive one waits off
 * to its side, faded and inert (no focus, hidden from screen readers). Phones
 * show only the active form, so the card is not as tall as the longer one,
 * and the form arriving there glides in from its side instead of sliding.
 */
function FormSlide({ mode, active, from, header, children }: FormSlideProps) {
  return (
    <div
      inert={!active}
      className={cn(
        'col-start-1 row-start-1 flex flex-col justify-start gap-6 p-6 sm:p-8',
        'transition-[translate,opacity]', slideTiming,
        active
          ? cn(
              'translate-x-0 opacity-100',
              'max-md:animate-in max-md:fade-in max-md:duration-500 max-md:ease-out motion-reduce:animate-none',
              from === 'left' ? 'max-md:slide-in-from-left-8' : 'max-md:slide-in-from-right-8',
            )
          : cn('opacity-0 max-md:hidden', from === 'left' ? '-translate-x-full' : 'translate-x-full'),
      )}
    >
      {header ?? <AuthTabs mode={mode} />}
      {children}
    </div>
  )
}

/**
 * Back from the forgotten password panel: to the login (with the page a guest asked for, auth K2),
 * or for a logged-in player to the settings.
 */
function BackLink() {
  const { data: account } = useAccount()
  const fromState = useFromState()

  return (
    <Link
      to={account ? '/beallitasok' : '/login'}
      state={account ? null : fromState}
      className={cn('inline-flex items-center gap-2 self-start', quietLinkClass)}
    >
      <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" className="size-3" />
      {account ? 'Vissza' : 'Vissza a belépéshez'}
    </Link>
  )
}
