import { faEnvelope, faKey, faPaperPlane } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { useIsMobile } from '@/hooks/use-mobile'
import { ApiError } from '@/lib/api'

import { resendAtFromError } from './api'
import { CodeField } from './CodeField'
import { applyApiError, formMessage } from './errors'
import { PasswordField, TextField } from './fields'
import { FormAlert } from './FormAlert'
import { useRequestPasswordReset, useResetPassword, useVerifyResetCode } from './queries'
import {
  codeSchema,
  forgotEmailSchema,
  newPasswordSchema,
  PASSWORD_MIN_LENGTH,
  type CodeValues,
  type ForgotEmailValues,
  type NewPasswordValues,
} from './schemas'
import { linkButtonClass } from './styles'
import { useCountdown } from './useCountdown'

/** The code that went out: to which address, until when it works (unknown after a reload), from when a new one may be asked. */
type Sent = { email: string; expiresAt: number | null; resendAt: number }

type Step = 'email' | 'code' | 'password'

const submitClass = 'h-11 w-full rounded-lg text-base font-semibold md:h-10'

/**
 * The forgotten password panel: e-mail, then the mailed code, then the new
 * password, each section appearing under the previous one. A wrong code
 * costs one of the account's guesses (5 per code, 10 per day), so the code
 * is sent at most once at a time; a code that still works is never lost by
 * going back to the e-mail or reloading the page.
 */
export function ForgotPasswordForm() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const requestReset = useRequestPasswordReset()
  const verifyCode = useVerifyResetCode()
  const resetPassword = useResetPassword()

  const [step, setStep] = useState<Step>('email')
  const [sent, setSent] = useState<Sent | null>(null)
  // After a reload: a code went to this address a moment ago and may be in the mailbox.
  const [codeMayBeOut, setCodeMayBeOut] = useState<{ email: string; resendAt: number } | null>(null)
  const [checking, setChecking] = useState(false)
  const [resending, setResending] = useState(false)
  // Set before a request starts, so a second submit in the same moment sends nothing.
  const verifying = useRef(false)
  const saving = useRef(false)
  const secondsLeft = useCountdown(sent?.resendAt ?? null)

  const emailForm = useForm<ForgotEmailValues>({ resolver: zodResolver(forgotEmailSchema), defaultValues: { email: '' } })
  const codeForm = useForm<CodeValues>({ resolver: zodResolver(codeSchema), defaultValues: { code: '' } })
  const passwordForm = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '', passwordConfirmation: '' },
  })

  // Focus is asked for and given once the field can take it: a browser refuses
  // focus on a disabled field (the code field while a code is checked or sent).
  const [focusRequest, setFocusRequest] = useState<{ field: 'email' | 'code' | 'password'; count: number } | null>(null)
  const askFocus = (field: 'email' | 'code' | 'password') => setFocusRequest((last) => ({ field, count: (last?.count ?? 0) + 1 }))
  useEffect(() => {
    if (!focusRequest || checking || resending) return
    if (focusRequest.field === 'email') emailForm.setFocus('email')
    if (focusRequest.field === 'code') codeForm.setFocus('code')
    if (focusRequest.field === 'password') passwordForm.setFocus('password')
  }, [focusRequest, checking, resending, emailForm, codeForm, passwordForm])

  // On phones each section that appears scrolls into view.
  const codeSection = useRef<HTMLDivElement>(null)
  const passwordSection = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const section = step === 'code' ? codeSection.current : step === 'password' ? passwordSection.current : null
    if (isMobile) section?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }, [step, isMobile])

  // The address typed now: "Írd be" only belongs to the address it was offered for.
  const typedEmail = useWatch({ control: emailForm.control, name: 'email' })

  const toCodeStep = (next: Sent) => {
    setSent(next)
    setCodeMayBeOut(null)
    emailForm.clearErrors()
    emailForm.setValue('email', next.email)
    codeForm.reset({ code: '' })
    setStep('code')
    askFocus('code')
  }

  /** Back to an empty first step: after a finished reset, or a permission that ran out. */
  const startOver = () => {
    setStep('email')
    setSent(null)
    setCodeMayBeOut(null)
    emailForm.reset()
    codeForm.reset()
    passwordForm.reset()
  }

  // The handlers run only from events (handleSubmit is called there), never during render.
  const onEmail = async ({ email }: ForgotEmailValues) => {
    // Enter in the locked address field: the code step is already past or open.
    if (step !== 'email') return
    setCodeMayBeOut(null)
    // The same address again while its code still works: no new mail (one per address every 10 minutes).
    if (sent && sent.email === email.toLowerCase() && sent.expiresAt !== null && sent.expiresAt > Date.now()) {
      setStep('code')
      askFocus('code')
      return
    }
    try {
      toCodeStep(await requestReset.mutateAsync(email))
    } catch (error) {
      const resendAt = resendAtFromError(error)
      if (resendAt !== null) setCodeMayBeOut({ email: email.toLowerCase(), resendAt })
      applyApiError(error, emailForm.setError, { email: 'email' })
    }
  }

  const editEmail = () => {
    setStep('email')
    codeForm.clearErrors()
    askFocus('email')
  }

  const onCode = async ({ code }: CodeValues) => {
    // A code typed while a new one is on its way would be checked against the old one and spend a guess.
    if (verifying.current || resending || !sent) return
    verifying.current = true
    setChecking(true)
    try {
      await verifyCode.mutateAsync({ email: sent.email, code })
      setStep('password')
      askFocus('password')
    } catch (error) {
      codeForm.reset({ code: '' })
      applyApiError(error, codeForm.setError, { code: 'code' })
      askFocus('code')
    } finally {
      verifying.current = false
      setChecking(false)
    }
  }

  const resend = async () => {
    if (!sent || verifying.current) return
    setResending(true)
    codeForm.clearErrors()
    try {
      const next = await requestReset.mutateAsync(sent.email)
      setSent(next)
      codeForm.reset({ code: '' })
      askFocus('code')
      toast.success('Új kódot küldtünk. A korábbi kód már nem érvényes.')
    } catch (error) {
      // Refused by the cooldown (another tab asked a moment ago): count down again.
      const resendAt = resendAtFromError(error)
      if (resendAt !== null) setSent({ ...sent, resendAt })
      codeForm.setError('root.server', { message: formMessage(error) })
    } finally {
      setResending(false)
    }
  }

  const onPassword = async (values: NewPasswordValues) => {
    if (saving.current) return
    saving.current = true
    try {
      const { username, account } = await resetPassword.mutateAsync(values)
      // The panel stays mounted beside the login: nothing of this reset, the new password least of all, stays in it.
      startOver()
      toast.success('Megváltozott a jelszavad, most már beléphetsz.')
      // Logged out (the reset ended this account's session, or nobody was logged in): log in with the new one.
      navigate(account ? '/' : '/login', { state: account ? null : { username } })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'auth.reset_expired') {
        // The permission ran out: start again from the address.
        startOver()
        emailForm.setError('root.server', { message: error.message })
        askFocus('email')
        return
      }
      applyApiError(error, passwordForm.setError, { password: 'password', password_confirmation: 'passwordConfirmation' })
    } finally {
      saving.current = false
    }
  }

  const emailLocked = step !== 'email'
  const verified = step === 'password'
  const emailErrors = emailForm.formState.errors

  return (
    <section aria-labelledby="forgot-heading" className="flex flex-col gap-6">
      <div>
        <h2 id="forgot-heading" className="font-heading text-2xl leading-tight text-foreground">
          Elfelejtett jelszó
        </h2>
        <p className="mt-2 text-pretty text-muted-foreground">
          Add meg a fiókod e-mail címét: küldünk egy kódot, és utána új jelszót adhatsz meg.
        </p>
      </div>

      <form onSubmit={(event) => void emailForm.handleSubmit(onEmail)(event)} noValidate>
        <FieldGroup className="gap-4">
          <FormAlert message={emailErrors.root?.server?.message} />
          <TextField
            label="E-mail cím"
            icon={faEnvelope}
            type="email"
            placeholder="pl. peldaemail@gmail.com"
            autoComplete="email"
            spellCheck={false}
            readOnly={emailLocked}
            error={emailErrors.email?.message}
            {...emailForm.register('email')}
          />
          {codeMayBeOut && !emailLocked && codeMayBeOut.email === typedEmail.trim().toLowerCase() && (
            <p className="text-sm text-muted-foreground">
              Már megkaptad a kódot?{' '}
              <button
                type="button"
                className={linkButtonClass}
                onClick={() => toCodeStep({ email: codeMayBeOut.email, expiresAt: null, resendAt: codeMayBeOut.resendAt })}
              >
                Írd be
              </button>
            </p>
          )}
          {emailLocked && sent ? (
            <p className="text-sm text-pretty text-muted-foreground">
              Elküldtük a kódot ide: <span className="font-medium wrap-anywhere text-foreground">{sent.email}</span>.{' '}
              {!verified && (
                <button type="button" onClick={editEmail} disabled={checking || resending} className={linkButtonClass}>
                  Módosítás
                </button>
              )}
            </p>
          ) : (
            <Button type="submit" disabled={emailForm.formState.isSubmitting} className={submitClass}>
              <FontAwesomeIcon icon={faPaperPlane} aria-hidden="true" />
              {emailForm.formState.isSubmitting ? 'Küldés…' : 'Kód küldése'}
            </Button>
          )}
        </FieldGroup>
      </form>

      {emailLocked && sent && (
        <Reveal ref={codeSection}>
          <form onSubmit={(event) => void codeForm.handleSubmit(onCode)(event)} noValidate>
            <FieldGroup className="gap-4">
              <FormAlert message={codeForm.formState.errors.root?.server?.message} />
              <CodeField
                id="reset-code"
                label="Kód az e-mailből"
                control={codeForm.control}
                disabled={checking || resending}
                success={verified}
                onComplete={() => void codeForm.handleSubmit(onCode)()}
              />
              {!verified && (
                <div className="flex flex-col gap-3">
                  <Button type="submit" disabled={checking || resending} className={submitClass}>
                    <FontAwesomeIcon icon={faKey} aria-hidden="true" />
                    Kód ellenőrzése
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => void resend()}
                    disabled={secondsLeft > 0 || checking || resending}
                    className="w-full"
                  >
                    {secondsLeft > 0 ? `Újraküldés ${secondsLeft} mp múlva` : resending ? 'Küldés…' : 'Kód újraküldése'}
                  </Button>
                </div>
              )}
            </FieldGroup>
          </form>
        </Reveal>
      )}

      {verified && (
        <Reveal ref={passwordSection}>
          <form onSubmit={(event) => void passwordForm.handleSubmit(onPassword)(event)} noValidate>
            <FieldGroup className="gap-4">
              <FormAlert message={passwordForm.formState.errors.root?.server?.message} />
              <PasswordField
                label="Új jelszó"
                autoComplete="new-password"
                description={`Min. ${PASSWORD_MIN_LENGTH} karakter: magyar vagy angol betűk, számok és egyszerű szimbólumok.`}
                error={passwordForm.formState.errors.password?.message}
                {...passwordForm.register('password')}
              />
              <PasswordField
                label="Új jelszó újra"
                autoComplete="new-password"
                error={passwordForm.formState.errors.passwordConfirmation?.message}
                {...passwordForm.register('passwordConfirmation')}
              />
              <Button type="submit" disabled={passwordForm.formState.isSubmitting} className={submitClass}>
                {passwordForm.formState.isSubmitting ? 'Mentés…' : 'Jelszó mentése'}
              </Button>
            </FieldGroup>
          </form>
        </Reveal>
      )}
    </section>
  )
}

/** A section sliding in under the previous one (still under reduced motion). */
function Reveal({ ref, children }: { ref: Ref<HTMLDivElement>; children: ReactNode }) {
  return (
    <div ref={ref} className="animate-in fade-in slide-in-from-top-2 duration-300 motion-reduce:animate-none">
      {children}
    </div>
  )
}
