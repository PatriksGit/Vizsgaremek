import { faArrowLeft, faRightToBracket, faUser } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation } from 'react-router'

import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { ApiError, formMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

import { CodeField } from './CodeField'
import { PasswordField, TextField } from './fields'
import { FormAlert } from './FormAlert'
import { useFromState } from './fromState'
import { useLogin, useLoginWithTwoFactor } from './queries'
import { loginSchema, TOTP_LENGTH, type LoginValues } from './schemas'
import { quietLinkClass, submitButtonClass } from './styles'
import { useCodeForm } from './useCodeForm'

/** Router state the forgotten password panel leaves after a reset: the name to log in with. */
type ResetState = { username?: string } | null

const submitClass = cn('mt-2', submitButtonClass)

export function LoginForm() {
  const login = useLogin()
  const loginWithTwoFactor = useLoginWithTwoFactor()
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })
  const { errors, isSubmitting } = form.formState
  // The password of a 2FA account checked out: the authenticator code comes next (2026-11-22).
  const [askingCode, setAskingCode] = useState(false)
  // Leaving the code step (Vissza a jelszóhoz, a reset) drops the answer to a code still on its way (AUTH-2).
  const { form: codeForm, submit: submitCode } = useCodeForm({
    active: askingCode,
    // Logged in: the login page sends the player on to the home page.
    send: async (code) => {
      await loginWithTwoFactor.mutateAsync(code)
    },
    onRefused: (error) => {
      if (!(error instanceof ApiError && error.code === 'auth.two_factor_expired')) return false
      backToPassword(error.message)
      return true
    },
  })

  const fromState = useFromState()

  // This form stays mounted behind the other panels, so the name comes in later, not as a default.
  const location = useLocation()
  const resetUsername = (location.state as ResetState)?.username
  // One reset fills the form once: coming back to its history entry later (Back, Forward) is not another reset (AU-1).
  const [filled, setFilled] = useState<{ entry: string; username: string } | null>(null)
  if (resetUsername && location.key !== filled?.entry) {
    setFilled({ entry: location.key, username: resetUsername })
    // A reset also ends a code step the player left open (the browser's Back from it to the panel).
    setAskingCode(false)
  }
  useEffect(() => {
    if (!filled) return
    // The failed login (or code) that sent the player to the reset is over too.
    codeForm.reset({ code: '' })
    form.clearErrors()
    form.setValue('username', filled.username)
    form.setValue('password', '')
    form.setFocus('password')
  }, [filled, form, codeForm])

  // Focus moves with the step, once its field is on the page.
  const wasAskingCode = useRef(false)
  useEffect(() => {
    if (askingCode) codeForm.setFocus('code')
    else if (wasAskingCode.current) form.setFocus('password')
    wasAskingCode.current = askingCode
  }, [askingCode, codeForm, form])

  /** Back to the password: the player chose to, or the five minutes for the code ran out. */
  const backToPassword = (message?: string) => {
    setAskingCode(false)
    codeForm.reset({ code: '' })
    form.setValue('password', '')
    if (message) form.setError('root.server', { message })
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      // Logged in: the login page sends the player on to the home page.
      const result = await login.mutateAsync(values)
      if (result.twoFactorRequired) setAskingCode(true)
    } catch (error) {
      // Wrong credentials come back on the username field, but they are about both.
      form.setError('root.server', { message: formMessage(error) })
    }
  })

  if (askingCode) {
    return (
      <form onSubmit={(event) => void submitCode(event)} noValidate>
        <FieldGroup>
          <div className="flex flex-col gap-1.5">
            <h2 className="font-heading text-xl font-bold text-foreground">Kétlépcsős azonosítás</h2>
            <p className="text-sm text-muted-foreground">Írd be a hitelesítő alkalmazásodban látható {TOTP_LENGTH} jegyű kódot.</p>
          </div>
          <FormAlert message={codeForm.formState.errors.root?.server?.message} />
          <CodeField
            id="login-two-factor-code"
            label="Kód az alkalmazásból"
            length={TOTP_LENGTH}
            control={codeForm.control}
            disabled={codeForm.formState.isSubmitting}
            onComplete={() => void submitCode()}
          />
          <Button type="submit" disabled={codeForm.formState.isSubmitting} className={submitClass}>
            <FontAwesomeIcon icon={faRightToBracket} aria-hidden="true" />
            {codeForm.formState.isSubmitting ? 'Belépés…' : 'Belépés'}
          </Button>
          <button
            type="button"
            onClick={() => backToPassword()}
            className={cn('inline-flex items-center gap-2 self-center', quietLinkClass)}
          >
            <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" className="size-3" />
            Vissza a jelszóhoz
          </button>
        </FieldGroup>
      </form>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormAlert message={errors.root?.server?.message} />
        <TextField
          label="Játékosnév"
          icon={faUser}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Játékosnév"
          error={errors.username?.message}
          {...form.register('username')}
        />
        <div className="flex flex-col gap-2">
          <PasswordField
            label="Jelszó"
            autoComplete="current-password"
            error={errors.password?.message}
            {...form.register('password')}
          />
          {/* The panel slides in on the same card, so what was typed here stays; the page asked for comes along. */}
          <Link to="/forgot-password" state={fromState} className={cn('self-end', quietLinkClass)}>
            Elfelejtetted a jelszavad?
          </Link>
        </div>
        <Button type="submit" disabled={isSubmitting} className={submitClass}>
          <FontAwesomeIcon icon={faRightToBracket} aria-hidden="true" />
          {isSubmitting ? 'Belépés…' : 'Belépés'}
        </Button>
      </FieldGroup>
    </form>
  )
}
