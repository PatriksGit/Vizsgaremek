import { faUserPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

import type { PendingRegistration } from './api'
import { CodeField } from './CodeField'
import { applyApiError, formMessage } from './errors'
import { FormAlert } from './FormAlert'
import { useVerifyRegistration } from './queries'
import { CODE_LENGTH, codeSchema, type CodeValues } from './schemas'
import { linkButtonClass } from './styles'

type RegisterCodeStepProps = {
  pending: PendingRegistration
  /** Sends a fresh code to the same address; false when the details went back to be fixed. */
  onResend: () => Promise<boolean>
  onBack: () => void
}

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
      // Refused details took the player back to the details step: no code went out.
      if (!(await onResend())) return
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
          {pending.expiresInMinutes === null
            ? 'Írd be a nemrég kapott kódot: a fiók azokkal az adatokkal jön létre, amelyekkel a kódot kérted.'
            : `${pending.expiresInMinutes} percig érvényes. Ha nem látod, nézd meg a spam mappát is.`}
        </p>
      </div>

      <FormAlert message={errors.root?.server?.message} />

      <CodeField id="registration-code" label="Megerősítő kód" control={form.control} />

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
