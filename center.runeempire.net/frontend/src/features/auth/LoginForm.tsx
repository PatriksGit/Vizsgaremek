import { faArrowLeft, faRightToBracket, faUser } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation } from 'react-router'

import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { ApiError } from '@/lib/api'

import { CodeField } from './CodeField'
import { applyApiError, formMessage } from './errors'
import { PasswordField, TextField } from './fields'
import { FormAlert } from './FormAlert'
import { useLogin, useLoginWithTwoFactor } from './queries'
import { loginSchema, TOTP_LENGTH, totpSchema, type CodeValues, type LoginValues } from './schemas'

/** Router state the forgotten password panel leaves after a reset: the name to log in with. */
type ResetState = { username?: string } | null

const submitClass = 'mt-2 h-11 w-full rounded-lg text-base font-semibold md:h-10'

export function LoginForm() {
  const login = useLogin()
  const loginWithTwoFactor = useLoginWithTwoFactor()
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })
  const codeForm = useForm<CodeValues>({ resolver: zodResolver(totpSchema), defaultValues: { code: '' } })
  const { errors, isSubmitting } = form.formState
  // The password of a 2FA account checked out: the authenticator code comes next (2026-11-22).
  const [askingCode, setAskingCode] = useState(false)
  // Set before a request starts, so the auto-submit and a click in the same moment send one code.
  const sendingCode = useRef(false)

  // This form stays mounted behind the other panels, so the name comes in later, not as a default.
  const resetUsername = (useLocation().state as ResetState)?.username
  useEffect(() => {
    if (resetUsername) {
      // The failed login that sent the player to the reset is over too.
      form.clearErrors()
      form.setValue('username', resetUsername)
      form.setValue('password', '')
      form.setFocus('password')
    }
  }, [resetUsername, form])

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

  const onCode = async ({ code }: CodeValues) => {
    if (sendingCode.current) return
    sendingCode.current = true
    try {
      // Logged in: the login page sends the player on to the home page.
      await loginWithTwoFactor.mutateAsync(code)
    } catch (error) {
      if (error instanceof ApiError && error.code === 'auth.two_factor_expired') {
        backToPassword(error.message)
        return
      }
      codeForm.reset({ code: '' })
      applyApiError(error, codeForm.setError, { code: 'code' })
      codeForm.setFocus('code')
    } finally {
      sendingCode.current = false
    }
  }

  if (askingCode) {
    return (
      <form onSubmit={(event) => void codeForm.handleSubmit(onCode)(event)} noValidate>
        <FieldGroup>
          <div className="flex flex-col gap-1.5">
            <h2 className="font-heading text-xl font-bold text-foreground">Kétlépcsős azonosítás</h2>
            <p className="text-sm text-muted-foreground">Írd be a hitelesítő alkalmazásodban látható 6 jegyű kódot.</p>
          </div>
          <FormAlert message={codeForm.formState.errors.root?.server?.message} />
          <CodeField
            id="login-two-factor-code"
            label="Kód az alkalmazásból"
            length={TOTP_LENGTH}
            control={codeForm.control}
            disabled={codeForm.formState.isSubmitting}
            onComplete={() => void codeForm.handleSubmit(onCode)()}
          />
          <Button type="submit" disabled={codeForm.formState.isSubmitting} className={submitClass}>
            <FontAwesomeIcon icon={faRightToBracket} aria-hidden="true" />
            {codeForm.formState.isSubmitting ? 'Belépés…' : 'Belépés'}
          </Button>
          <button
            type="button"
            onClick={() => backToPassword()}
            className="inline-flex items-center gap-2 self-center rounded-sm text-sm text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
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
          {/* The panel slides in on the same card, so what was typed here stays. */}
          <Link
            to="/forgot-password"
            className="self-end rounded-sm text-sm text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
          >
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
