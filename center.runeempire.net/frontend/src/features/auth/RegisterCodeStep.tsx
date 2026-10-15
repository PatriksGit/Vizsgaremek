import { faUserPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { cn } from '@/lib/utils'

import { CODE_LENGTH } from './validation'

type RegisterCodeStepProps = {
  email: string
  onBack: () => void
}

export function RegisterCodeStep({ email, onBack }: RegisterCodeStepProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string>()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (code.length !== CODE_LENGTH) {
      setError(`Írd be mind a ${CODE_LENGTH} számjegyet.`)
      return
    }
    setError(undefined)

    // TODO: POST /api/auth/register/verify once the frontend is wired to the backend.
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div>
        <h2 className="font-heading text-3xl leading-tight text-foreground">Nézd meg az e-mailed</h2>
        <p className="mt-2 text-muted-foreground">
          Küldtünk egy {CODE_LENGTH} jegyű kódot ide:{' '}
          <span className="font-medium wrap-anywhere text-foreground">{email}</span>
        </p>
      </div>

      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor="registration-code" className="text-foreground">
          Megerősítő kód
        </FieldLabel>
        <InputOTP
          id="registration-code"
          maxLength={CODE_LENGTH}
          inputMode="numeric"
          pattern="^[0-9]*$"
          autoComplete="one-time-code"
          value={code}
          onChange={setCode}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'registration-code-error' : undefined}
        >
          <InputOTPGroup className="w-full gap-2">
            {Array.from({ length: CODE_LENGTH }, (_, index) => (
              <InputOTPSlot
                key={index}
                index={index}
                className={cn(
                  'h-14 flex-1 rounded-lg border border-white/10 bg-black/25 text-xl font-semibold text-foreground tabular-nums shadow-[inset_0_1px_3px_rgb(0_0_0/0.35)] first:rounded-lg last:rounded-lg',
                  error && 'border-destructive',
                )}
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
        <FieldError id="registration-code-error">{error}</FieldError>
      </Field>

      <div className="flex flex-col gap-3">
        <Button type="submit" className="h-11 w-full rounded-lg text-base font-semibold shadow-[0_8px_24px_-8px_rgb(242_181_68/0.55)]">
          <FontAwesomeIcon icon={faUserPlus} aria-hidden="true" />
          Fiók létrehozása
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Rossz e-mail címet adtál meg?{' '}
          <button
            type="button"
            onClick={onBack}
            className="rounded-sm font-medium text-foreground underline underline-offset-4 outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Javítsd ki
          </button>
        </p>
      </div>
    </form>
  )
}
