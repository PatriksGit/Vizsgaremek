import { faUserPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

import type { PendingRegistration } from './api'
import { CodeField } from './CodeField'
import { formMessage } from './errors'
import { FormAlert } from './FormAlert'
import { useVerifyRegistration } from './queries'
import { CODE_LENGTH, CODE_RESENT_MESSAGE, codeSchema } from './schemas'
import { linkButtonClass, submitButtonClass } from './styles'
import { useCodeForm } from './useCodeForm'

type RegisterCodeStepProps = {
  pending: PendingRegistration
  /** Sends a fresh code to the same address; false when the details went back to be fixed. */
  onResend: () => Promise<boolean>
  onBack: () => void
}

export function RegisterCodeStep({ pending, onResend, onBack }: RegisterCodeStepProps) {
  const verify = useVerifyRegistration()
  // Sent on the last digit like every other code field (review 2026-11-23 auth K1); a wrong code empties the boxes.
  const { form, submit } = useCodeForm({
    schema: codeSchema,
    // Leaving this step unmounts it, and "Javítsd ki" waits for the answer.
    active: true,
    send: async (code) => {
      // The account exists and the player is logged in: the login page sends them on.
      await verify.mutateAsync({ email: pending.email, code })
    },
  })
  const [resending, setResending] = useState(false)
  const { errors, isSubmitting } = form.formState
  // One action at a time: a resend invalidates the code being verified, and
  // going back mid-request would land its answer on the wrong step.
  const busy = isSubmitting || resending

  // The details form that had focus is gone: move focus to this step's heading,
  // so keyboard and screen reader users land on "Nézd meg az e-mailed".
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => headingRef.current?.focus(), [])

  async function resend() {
    form.clearErrors()
    setResending(true)
    try {
      // Refused details took the player back to the details step: no code went out.
      if (!(await onResend())) return
      form.reset({ code: '' })
      toast.success(CODE_RESENT_MESSAGE)
    } catch (error) {
      form.setError('root.server', { message: formMessage(error) })
    } finally {
      setResending(false)
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-6">
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

      <CodeField
        id="registration-code"
        label="Megerősítő kód"
        control={form.control}
        disabled={busy}
        onComplete={() => void submit()}
      />

      <div className="flex flex-col gap-3">
        <Button type="submit" disabled={busy} className={submitButtonClass}>
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
