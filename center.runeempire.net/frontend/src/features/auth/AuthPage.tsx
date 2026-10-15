import type { ReactNode } from 'react'
import { useLocation } from 'react-router'

import { ServerBackdrop } from '@/components/ServerBackdrop'
import { site } from '@/config/site'
import { enterAfter } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { AuthShowcase, type AuthMode } from './AuthShowcase'
import { AuthTabs } from './AuthTabs'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'

/**
 * Login and registration on one glass card: the info panel stays on the
 * left, and the forms slide past each other on the right. Both forms stay
 * mounted, so switching back and forth keeps what was typed.
 */
export function AuthPage() {
  const { pathname } = useLocation()
  const mode: AuthMode = pathname === '/register' ? 'register' : 'login'

  return (
    <div className="relative isolate flex min-h-dvh items-center justify-center bg-background px-4 py-10 sm:px-6">
      <title>{`${mode === 'register' ? 'Regisztráció' : 'Belépés'} | ${site.name}`}</title>
      <ServerBackdrop />

      <div className="card-rise grid w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-black/55 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8),inset_0_1px_0_rgb(255_255_255/0.08)] backdrop-blur-xl md:grid-cols-2">
        <AuthShowcase className="border-white/10 max-md:border-b md:border-r" />

        {/* Both forms share one grid cell, so the column is as tall as the taller one.
            The entrance plays on this wrapper: the slides' own opacity drives the slide. */}
        <div className="content-in grid overflow-hidden" style={enterAfter(500)}>
          <FormSlide mode={mode} active={mode === 'login'} from="left">
            <LoginForm />
          </FormSlide>
          <FormSlide mode={mode} active={mode === 'register'} from="right">
            <RegisterForm />
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
  children: ReactNode
}

/**
 * One form with its tabs, centred in the slider. The inactive one waits off
 * to its side, faded and inert (no focus, hidden from screen readers). Phones
 * skip the slide and show only the active form, so the card is not as tall
 * as the longer one.
 */
function FormSlide({ mode, active, from, children }: FormSlideProps) {
  return (
    <div
      inert={!active}
      className={cn(
        'col-start-1 row-start-1 flex flex-col justify-center gap-6 p-6 sm:p-8',
        'transition-[translate,opacity] duration-600 ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none',
        active
          ? 'translate-x-0 opacity-100'
          : cn('opacity-0 max-md:hidden', from === 'left' ? '-translate-x-full' : 'translate-x-full'),
      )}
    >
      <AuthTabs mode={mode} />
      {children}
    </div>
  )
}
