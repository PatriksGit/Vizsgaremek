import { useState, type ReactNode } from 'react'
import { useLocation } from 'react-router'

import { site } from '@/config/site'
import { cn } from '@/lib/utils'

import { AuthShowcase, type AuthMode } from './AuthShowcase'
import { AuthTabs } from './AuthTabs'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'

/**
 * Login and registration on one glass card: the artwork panel stays on the
 * left, and the forms slide past each other on the right. Both forms stay
 * mounted, so switching back and forth keeps what was typed.
 */
export function AuthPage() {
  const { pathname } = useLocation()
  const mode: AuthMode = pathname === '/register' ? 'register' : 'login'
  const [names, setNames] = useState<Record<AuthMode, string>>({ login: '', register: '' })

  return (
    <div
      className="relative isolate flex min-h-dvh items-center justify-center bg-background bg-cover bg-center px-4 py-10 sm:px-6"
      style={site.authBackgroundUrl ? { backgroundImage: `url(${site.authBackgroundUrl})` } : undefined}
    >
      {!site.authBackgroundUrl && (
        // Stand-in for the shader image, so the glass has light to blur.
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_20%_25%,rgb(242_181_68/0.18),transparent_70%),radial-gradient(40%_40%_at_85%_80%,rgb(92_200_255/0.14),transparent_70%)]"
        />
      )}

      <div className="grid w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-white/12 bg-white/[0.05] shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8),inset_0_1px_0_rgb(255_255_255/0.08)] backdrop-blur-2xl md:grid-cols-2">
        <AuthShowcase mode={mode} name={names[mode]} className="border-white/10 max-md:border-b md:border-r" />

        {/* Both forms share one grid cell, so the column is as tall as the taller one. */}
        <div className="grid overflow-hidden">
          <FormSlide mode={mode} active={mode === 'login'} from="left">
            <LoginForm onNameChange={(name) => setNames((current) => ({ ...current, login: name }))} />
          </FormSlide>
          <FormSlide mode={mode} active={mode === 'register'} from="right">
            <RegisterForm onNameChange={(name) => setNames((current) => ({ ...current, register: name }))} />
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
        'col-start-1 row-start-1 flex flex-col justify-center gap-8 p-6 sm:p-10',
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
