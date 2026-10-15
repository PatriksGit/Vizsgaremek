import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'

import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

import type { PendingRegistration } from './api'
import { applyApiError } from './errors'
import { useStartRegistration } from './queries'
import { RegisterCodeStep } from './RegisterCodeStep'
import { RegisterDetailsStep } from './RegisterDetailsStep'
import { registerFieldForKey, registerSchema, type RegisterValues } from './schemas'

const STEPS = ['Adatok', 'Megerősítés'] as const

/**
 * Registration is two steps on the backend too: the details start it and
 * email a code, the code creates the account. The details form lives here, so
 * going back from the code step keeps what was typed.
 */
export function RegisterForm() {
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', passwordConfirmation: '', termsAccepted: false, ageConfirmed: false },
  })
  const startRegistration = useStartRegistration()
  const [pending, setPending] = useState<PendingRegistration>()
  const step = pending ? 1 : 0

  async function requestCode(values: RegisterValues) {
    setPending(
      await startRegistration.mutateAsync({
        displayName: values.name,
        email: values.email,
        password: values.password,
        passwordConfirmation: values.passwordConfirmation,
        termsAccepted: values.termsAccepted,
        ageConfirmed: values.ageConfirmed,
      }),
    )
  }

  /**
   * A fresh code to the same details. If the backend now rejects the details
   * (e.g. the name got taken meanwhile), the player is taken back to fix them;
   * any other failure is for the code step to show.
   */
  async function resendCode() {
    try {
      await requestCode(form.getValues())
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
        setPending(undefined)
        applyApiError(error, form.setError, registerFieldForKey)
        return
      }
      throw error
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <ol className="grid grid-cols-2 gap-3 text-sm">
        {STEPS.map((label, index) => (
          <li
            key={label}
            aria-current={index === step ? 'step' : undefined}
            className={cn('flex flex-col gap-2', index === step ? 'text-foreground' : 'text-muted-foreground')}
          >
            <span aria-hidden="true" className={cn('h-1 rounded-full', index <= step ? 'bg-primary' : 'bg-border')} />
            <span>
              <span className="sr-only">{index + 1}. lépés: </span>
              {label}
            </span>
          </li>
        ))}
      </ol>

      <FormProvider {...form}>
        {pending ? (
          <RegisterCodeStep pending={pending} onResend={resendCode} onBack={() => setPending(undefined)} />
        ) : (
          <RegisterDetailsStep onSubmit={requestCode} />
        )}
      </FormProvider>
    </div>
  )
}
