import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState } from 'react'
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
 *
 * A code stays valid for 15 minutes but one address gets a new one only every
 * 10 minutes, so the page never strands a player with a working code: going
 * back and sending the same details again returns to the code step without a
 * request, and after a reload the cooldown's 429 offers to type the code in.
 */
export function RegisterForm() {
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', passwordConfirmation: '', termsAccepted: false, ageConfirmed: false },
  })
  const startRegistration = useStartRegistration()
  const [pending, setPending] = useState<PendingRegistration>()
  // The last code that went out: the details it was sent for, and until when it works.
  const sent = useRef<{ details: string; pending: PendingRegistration; until: number } | null>(null)
  // Coming back from the code step, focus goes to the field to fix instead of being lost.
  const [cameBack, setCameBack] = useState(false)
  const step = pending ? 1 : 0

  async function requestCode(values: RegisterValues, fresh = false) {
    const details = JSON.stringify(values)
    // Back to look and sent unchanged: the code in the mailbox is still the one.
    if (!fresh && sent.current?.details === details && Date.now() < sent.current.until) {
      setPending(sent.current.pending)
      return
    }

    const next = await startRegistration.mutateAsync({
      displayName: values.name,
      email: values.email,
      password: values.password,
      passwordConfirmation: values.passwordConfirmation,
      termsAccepted: values.termsAccepted,
      ageConfirmed: values.ageConfirmed,
    })
    sent.current = { details, pending: next, until: Date.now() + (next.expiresInMinutes ?? 0) * 60_000 }
    setPending(next)
  }

  /**
   * A fresh code to the same details. If the backend now rejects the details
   * (e.g. the name got taken meanwhile), the player is taken back to fix them;
   * any other failure is for the code step to show. Resolves to whether a code went out.
   */
  async function resendCode(): Promise<boolean> {
    try {
      // Trimmed like a submit, so going back and sending the same details still
      // matches; details edited into an invalid shape go as typed, for the backend to answer.
      const parsed = registerSchema.safeParse(form.getValues())
      await requestCode(parsed.success ? parsed.data : form.getValues(), true)
      return true
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
        setPending(undefined)
        applyApiError(error, form.setError, registerFieldForKey)
        return false
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
          <RegisterCodeStep
            pending={pending}
            onResend={resendCode}
            onBack={() => {
              setPending(undefined)
              setCameBack(true)
            }}
          />
        ) : (
          <RegisterDetailsStep
            onSubmit={(values) => requestCode(values)}
            focusEmail={cameBack}
            onEnterCode={(email) => setPending({ email: email.trim(), expiresInMinutes: null })}
          />
        )}
      </FormProvider>
    </div>
  )
}
