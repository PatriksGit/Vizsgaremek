import { useState } from 'react'

import { cn } from '@/lib/utils'

import { startRegistration, type PendingRegistration } from './api'
import { RegisterCodeStep } from './RegisterCodeStep'
import { RegisterDetailsStep, type RegisterDetails } from './RegisterDetailsStep'

const STEPS = ['Adatok', 'Megerősítés'] as const

/**
 * Registration is two steps on the backend too: the details start it and
 * email a code, the code creates the account. Going back keeps the details.
 */
export function RegisterForm() {
  const [details, setDetails] = useState<RegisterDetails>({
    name: '',
    email: '',
    password: '',
    passwordConfirmation: '',
    termsAccepted: false,
  })
  const [pending, setPending] = useState<PendingRegistration>()
  const step = pending ? 1 : 0

  /** Starts the registration, or restarts it with a fresh code. */
  async function requestCode() {
    setPending(
      await startRegistration({
        displayName: details.name,
        email: details.email,
        password: details.password,
        passwordConfirmation: details.passwordConfirmation,
        termsAccepted: details.termsAccepted,
      }),
    )
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
            <span
              aria-hidden="true"
              className={cn('h-1 rounded-full', index <= step ? 'bg-primary' : 'bg-border')}
            />
            <span>
              <span className="sr-only">{index + 1}. lépés: </span>
              {label}
            </span>
          </li>
        ))}
      </ol>

      {pending ? (
        <RegisterCodeStep pending={pending} onResend={requestCode} onBack={() => setPending(undefined)} />
      ) : (
        <RegisterDetailsStep details={details} onChange={setDetails} onSubmit={requestCode} />
      )}
    </div>
  )
}
