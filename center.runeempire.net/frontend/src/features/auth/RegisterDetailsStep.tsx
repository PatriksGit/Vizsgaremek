import { faEnvelope, faPaperPlane, faUser } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useId, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldContent, FieldError, FieldGroup } from '@/components/ui/field'

import { PasswordField, TextField } from './fields'
import { LegalDialog } from './LegalDialog'
import {
  emailError,
  hasErrors,
  nameError,
  PASSWORD_MIN_LENGTH,
  passwordError,
  type FieldErrors,
} from './validation'

export type RegisterDetails = {
  name: string
  email: string
  password: string
  passwordConfirmation: string
  termsAccepted: boolean
}

type DetailsField = 'name' | 'email' | 'password' | 'passwordConfirmation' | 'terms'

type RegisterDetailsStepProps = {
  details: RegisterDetails
  onChange: (details: RegisterDetails) => void
  onDone: () => void
}

export function RegisterDetailsStep({ details, onChange, onDone }: RegisterDetailsStepProps) {
  const [errors, setErrors] = useState<FieldErrors<DetailsField>>({})
  const termsId = useId()

  function update(changes: Partial<RegisterDetails>) {
    onChange({ ...details, ...changes })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors: FieldErrors<DetailsField> = {
      name: nameError(details.name),
      email: emailError(details.email),
      password: passwordError(details.password),
      passwordConfirmation:
        details.password === details.passwordConfirmation ? undefined : 'A két jelszó nem egyezik.',
      terms: details.termsAccepted ? undefined : 'A regisztrációhoz el kell fogadnod az ÁSZF-et.',
    }
    setErrors(nextErrors)
    if (hasErrors(nextErrors)) return

    // TODO: POST /api/auth/register once the frontend is wired to the backend.
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        <TextField
          label="Játékosnév"
          icon={faUser}
          name="display_name"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="pl. PatrikT"
          description="Ezzel a névvel lépsz be a szerverre is."
          value={details.name}
          error={errors.name}
          onChange={(event) => {
            update({ name: event.target.value })
          }}
        />
        <TextField
          label="E-mail cím"
          icon={faEnvelope}
          name="email"
          type="email"
          autoComplete="email"
          spellCheck={false}
          description="Ide küldjük a megerősítő kódot."
          value={details.email}
          error={errors.email}
          onChange={(event) => update({ email: event.target.value })}
        />
        <PasswordField
          label="Jelszó"
          name="password"
          autoComplete="new-password"
          description={`Legalább ${PASSWORD_MIN_LENGTH} karakter, szóköz és § jel nélkül.`}
          value={details.password}
          error={errors.password}
          onChange={(event) => update({ password: event.target.value })}
        />
        <PasswordField
          label="Jelszó újra"
          name="password_confirmation"
          autoComplete="new-password"
          value={details.passwordConfirmation}
          error={errors.passwordConfirmation}
          onChange={(event) => update({ passwordConfirmation: event.target.value })}
        />

        <Field orientation="horizontal" data-invalid={errors.terms ? true : undefined}>
          <Checkbox
            id={termsId}
            checked={details.termsAccepted}
            onCheckedChange={(checked) => update({ termsAccepted: checked })}
            aria-labelledby={`${termsId}-text`}
            aria-describedby={errors.terms ? `${termsId}-error` : undefined}
            aria-invalid={errors.terms ? true : undefined}
            className="mt-0.5 size-5"
          />
          <FieldContent>
            <p id={`${termsId}-text`} className="text-sm leading-snug text-foreground">
              <label htmlFor={termsId} className="cursor-pointer">
                Elfogadom
              </label>{' '}
              az <LegalDialog title="Általános Szerződési Feltételek">ÁSZF-et</LegalDialog> és az{' '}
              <LegalDialog title="Adatkezelési tájékoztató">Adatkezelési tájékoztatót</LegalDialog>.
            </p>
            <FieldError id={`${termsId}-error`}>{errors.terms}</FieldError>
          </FieldContent>
        </Field>

        <Button type="submit" className="mt-2 h-11 w-full rounded-lg text-base font-semibold shadow-[0_8px_24px_-8px_rgb(242_181_68/0.55)]">
          <FontAwesomeIcon icon={faPaperPlane} aria-hidden="true" />
          Kód küldése
        </Button>
      </FieldGroup>
    </form>
  )
}
