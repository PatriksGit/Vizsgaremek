import { faCircleCheck, faEnvelope, faPaperPlane } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { useIsMobile } from '@/hooks/use-mobile'
import { formMessage } from '@/lib/api'

import { resendAtFromError } from './api'
import { CodeField } from './CodeField'
import { applyApiError } from './errors'
import { CodeMayBeOutHint, HoneypotField, TextField } from './fields'
import { ForgotNewPasswordStep } from './ForgotNewPasswordStep'
import { FormAlert } from './FormAlert'
import { useRequestPasswordReset, useVerifyResetCode } from './queries'
import { CODE_RESENT_MESSAGE, codeSchema, forgotEmailSchema, type ForgotEmailValues } from './schemas'
import { linkButtonClass, submitButtonClass as submitClass } from './styles'
import { useCodeForm } from './useCodeForm'
import { useCountdown } from './useCountdown'

/** The code that went out: to which address, until when it works (unknown after a reload), from when a new one may be asked. */
type Sent = { email: string; expiresAt: number | null; resendAt: number }

type Step = 'email' | 'code' | 'password'

/**
 * The forgotten password panel: e-mail, then the mailed code, then the new
 * password, each section appearing under the previous one. A wrong code
 * costs one of the account's guesses (5 per code, 10 per day), so the code
 * is sent at most once at a time; a code that still works is never lost by
 * going back to the e-mail or reloading the page.
 */
export function ForgotPasswordForm() {
  const isMobile = useIsMobile()
  const requestReset = useRequestPasswordReset()
  const verifyCode = useVerifyResetCode()

  const [step, setStep] = useState<Step>('email')
  const [sent, setSent] = useState<Sent | null>(null)
  // After a reload: a code went to this address a moment ago and may be in the mailbox.
  const [codeMayBeOut, setCodeMayBeOut] = useState<{ email: string; resendAt: number } | null>(null)
  const [checking, setChecking] = useState(false)
  // The verified account has 2FA: the last step asks its authenticator code too (2026-11-22).
  const [twoFactorRequired, setTwoFactorRequired] = useState(false)
  const [resending, setResending] = useState(false)
  const secondsLeft = useCountdown(sent?.resendAt ?? null)

  const emailForm = useForm<ForgotEmailValues>({ resolver: zodResolver(forgotEmailSchema), defaultValues: { email: '', newsletter: false } })
  // The mailed code, one at a time (useCodeForm); a refused one gives the field focus once it is enabled again.
  const { form: codeForm, submit: submitCode } = useCodeForm({
    schema: codeSchema,
    active: step === 'code',
    send: async (code) => {
      // A code typed while a new one is on its way would be checked against the old one and spend a guess.
      if (resending || !sent) return
      setChecking(true)
      try {
        const verified = await verifyCode.mutateAsync({ email: sent.email, code })
        setTwoFactorRequired(verified.twoFactorRequired)
        setStep('password')
        // The new password step takes the keyboard itself (ForgotNewPasswordStep).
        setFocusRequest(null)
      } finally {
        setChecking(false)
      }
    },
    focusCode: () => askFocus('code'),
  })

  // Focus is asked for and given once the field can take it: a browser refuses
  // focus on a disabled field (the code field while a code is checked or sent).
  const [focusRequest, setFocusRequest] = useState<{ field: 'email' | 'code'; count: number } | null>(null)
  const askFocus = (field: 'email' | 'code') => setFocusRequest((last) => ({ field, count: (last?.count ?? 0) + 1 }))
  useEffect(() => {
    if (!focusRequest || checking || resending) return
    if (focusRequest.field === 'email') emailForm.setFocus('email')
    if (focusRequest.field === 'code') codeForm.setFocus('code')
  }, [focusRequest, checking, resending, emailForm, codeForm])

  // On phones each section that appears scrolls into view.
  const codeSection = useRef<HTMLDivElement>(null)
  const passwordSection = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const section = step === 'code' ? codeSection.current : step === 'password' ? passwordSection.current : null
    if (isMobile) section?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
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
    setTwoFactorRequired(false)
    emailForm.reset()
    codeForm.reset()
  }

  // The handlers run only from events (handleSubmit is called there), never during render.
  const onEmail = async ({ email, newsletter }: ForgotEmailValues) => {
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
      toCodeStep(await requestReset.mutateAsync({ email, newsletter }))
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

  const resend = async () => {
    if (!sent || checking) return
    setResending(true)
    codeForm.clearErrors()
    try {
      // The bot trap goes along like on the first send: a tripped trap must not mail on the resend.
      const next = await requestReset.mutateAsync({ email: sent.email, newsletter: emailForm.getValues('newsletter') })
      setSent(next)
      codeForm.reset({ code: '' })
      askFocus('code')
      toast.success(CODE_RESENT_MESSAGE)
    } catch (error) {
      // Refused by the cooldown (another tab asked a moment ago): count down again.
      const resendAt = resendAtFromError(error)
      if (resendAt !== null) setSent({ ...sent, resendAt })
      codeForm.setError('root.server', { message: formMessage(error) })
    } finally {
      setResending(false)
    }
  }

  /** The permission ran out (auth.reset_expired): start again from the address, saying why. */
  const onExpired = (message: string) => {
    startOver()
    emailForm.setError('root.server', { message })
    askFocus('email')
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
          <HoneypotField {...emailForm.register('newsletter')} />
          {codeMayBeOut && (
            <CodeMayBeOutHint
              offeredFor={emailLocked ? null : codeMayBeOut.email}
              typed={typedEmail}
              onEnter={(email) => toCodeStep({ email, expiresAt: null, resendAt: codeMayBeOut.resendAt })}
            />
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
          <form onSubmit={(event) => void submitCode(event)} noValidate>
            <FieldGroup className="gap-4">
              <FormAlert message={codeForm.formState.errors.root?.server?.message} />
              <CodeField
                id="reset-code"
                label="Kód az e-mailből"
                control={codeForm.control}
                disabled={checking || resending}
                success={verified}
                onComplete={() => void submitCode()}
              />
              {!verified && (
                <div className="flex flex-col gap-3">
                  <Button type="submit" disabled={checking || resending} className={submitClass}>
                    <FontAwesomeIcon icon={faCircleCheck} aria-hidden="true" />
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
          <ForgotNewPasswordStep twoFactorRequired={twoFactorRequired} onDone={startOver} onExpired={onExpired} />
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
