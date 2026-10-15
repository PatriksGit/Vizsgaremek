import { useState } from 'react'

import { cn } from '@/lib/utils'

import { RegisterDetailsStep, type RegisterDetails } from './RegisterDetailsStep'
import { RegisterCodeStep } from './RegisterCodeStep'

const STEPS = ['Adatok', 'Megerősítés'] as const

/**
 * Registration is two steps on the backend too: the details start it and
 * email a code, the code creates the account. Going back keeps the details.
 */
export function RegisterForm({ onNameChange }: { onNameChange: (name: string) => void }) {
  const [step, setStep] = useState(0)
  const [details, setDetails] = useState<RegisterDetails>({
    name: '',
    email: '',
    password: '',
    passwordConfirmation: '',
    termsAccepted: false,
  })

  return (
    <div className="flex flex-col gap-6">
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

      {step === 0 ? (
        <RegisterDetailsStep details={details} onChange={(next) => {
            setDetails(next)
            onNameChange(next.name)
          }} onDone={() => setStep(1)} />
      ) : (
        <RegisterCodeStep email={details.email} onBack={() => setStep(0)} />
      )}
    </div>
  )
}
