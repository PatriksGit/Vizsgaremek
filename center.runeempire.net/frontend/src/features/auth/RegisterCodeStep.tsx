import { faUserPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { cn } from '@/lib/utils'

import type { PendingRegistration } from './api'
import { applyApiError, formMessage } from './errors'
import { FormAlert } from './FormAlert'
import { useVerifyRegistration } from './queries'
import { CODE_LENGTH, codeSchema, type CodeValues } from './schemas'

type RegisterCodeStepProps = {
  pending: PendingRegistration
  /** Sends a fresh code to the same address. */
  onResend: () => Promise<void>
  onBack: () => void
}

const linkButtonClass =
  'rounded-sm font-medium text-foreground underline underline-offset-4 outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60'

export function RegisterCodeStep({ pending, onResend, onBack }: RegisterCodeStepProps) {
  const verify = useVerifyRegistration()
  const form = useForm<CodeValues>({ resolver: zodResolver(codeSchema), defaultValues: { code: '' } })
  const [resending, setResending] = useState(false)
  const { errors, isSubmitting } = form.formState
  // One action at a time: a resend invalidates the code being verified, and
  // going back mid-request would land its answer on the wrong step.
  const busy = isSubmitting || resending

  // The details form that had focus is gone: move focus to this step's heading,
  // so keyboard and screen reader users land on "Nézd meg az e-mailed".
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => headingRef.current?.focus(), [])

  const submit = form.handleSubmit(async ({ code }) => {
    try {
      // The account exists and the player is logged in: the login page sends them on.
      await verify.mutateAsync({ email: pending.email, code })
    } catch (error) {
      applyApiError(error, form.setError, { code: 'code' })
    }
  })

  async function resend() {
    form.clearErrors()
    setResending(true)
    try {
      await onResend()
      form.reset({ code: '' })
      toast.success('Új kódot küldtünk. A korábbi kód már nem érvényes.')
    } catch (error) {
      form.setError('root.server', { message: formMessage(error) })
    } finally {
      setResending(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <div>
        <h2 ref={headingRef} tabIndex={-1} className="font-heading text-2xl leading-tight text-foreground outline-none">
          Nézd meg az e-mailed
        </h2>
        <p className="mt-2 text-muted-foreground">
          Küldtünk egy {CODE_LENGTH} jegyű kódot ide:{' '}
          <span className="font-medium wrap-anywhere text-foreground">{pending.email}</span>
        </p>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          {pending.expiresInMinutes} percig érvényes. Ha nem látod, nézd meg a spam mappát is.
        </p>
      </div>

      <FormAlert message={errors.root?.server?.message} />

      <Controller
        control={form.control}
        name="code"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.error ? true : undefined}>
            <FieldLabel htmlFor="registration-code" className="text-foreground">
              Megerősítő kód
            </FieldLabel>
            <InputOTP
              id="registration-code"
              ref={field.ref}
              maxLength={CODE_LENGTH}
              inputMode="numeric"
              pattern="^[0-9]*$"
              // A pasted "123 456" or " 123456" keeps only its digits.
              pasteTransformer={(pasted) => pasted.replace(/\D/g, '')}
              autoComplete="one-time-code"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              aria-invalid={fieldState.error ? true : undefined}
              aria-describedby={fieldState.error ? 'registration-code-error' : undefined}
            >
              <InputOTPGroup className="w-full gap-2">
                {Array.from({ length: CODE_LENGTH }, (_, index) => (
                  <InputOTPSlot
                    key={index}
                    index={index}
                    className={cn(
                      'h-12 flex-1 rounded-lg border border-white/10 bg-black/40 text-xl font-semibold text-foreground tabular-nums shadow-[inset_0_1px_3px_rgb(0_0_0/0.35)] first:rounded-lg last:rounded-lg',
                      fieldState.error && 'border-destructive',
                    )}
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <FieldError id="registration-code-error">{fieldState.error?.message}</FieldError>
          </Field>
        )}
      />

      <div className="flex flex-col gap-3">
        <Button
          type="submit"
          disabled={busy}
          className="h-11 w-full rounded-lg text-base font-semibold md:h-10"
        >
          <FontAwesomeIcon icon={faUserPlus} aria-hidden="true" />
          {isSubmitting ? 'Fiók létrehozása…' : 'Fiók létrehozása'}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Nem jött meg?{' '}
          <button type="button" onClick={resend} disabled={busy} className={linkButtonClass}>
            {resending ? 'Küldés…' : 'Új kódot kérek'}
          </button>
        </p>
        <p className="text-center text-sm text-muted-foreground">
          Rossz e-mail címet adtál meg?{' '}
          <button type="button" onClick={onBack} disabled={busy} className={linkButtonClass}>
            Javítsd ki
          </button>
        </p>
      </div>
    </form>
  )
}
