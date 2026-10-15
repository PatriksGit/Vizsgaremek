import { faEnvelope, faPaperPlane, faUser } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useId, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldContent, FieldError, FieldGroup } from '@/components/ui/field'

import { mapApiError } from './errors'
import { PasswordField, TextField } from './fields'
import { FormAlert } from './FormAlert'
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

/** Backend error keys → fields of this form. A name taken at the last moment comes back as username. */
const FIELD_FOR_KEY: Partial<Record<string, DetailsField>> = {
  display_name: 'name',
  username: 'name',
  email: 'email',
  password: 'password',
  password_confirmation: 'passwordConfirmation',
  terms: 'terms',
}

type RegisterDetailsStepProps = {
  details: RegisterDetails
  onChange: (details: RegisterDetails) => void
  /** Sends the details; resolves once the code is on its way. */
  onSubmit: () => Promise<void>
}

export function RegisterDetailsStep({ details, onChange, onSubmit }: RegisterDetailsStepProps) {
  const [errors, setErrors] = useState<FieldErrors<DetailsField>>({})
  const [formError, setFormError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)
  const termsId = useId()

  function update(changes: Partial<RegisterDetails>) {
    onChange({ ...details, ...changes })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
    setFormError(undefined)
    if (hasErrors(nextErrors)) return

    setSubmitting(true)
    try {
      // On success the parent moves on to the code step, which unmounts this form.
      await onSubmit()
    } catch (error) {
      const mapped = mapApiError(error, FIELD_FOR_KEY)
      setErrors(mapped.fieldErrors)
      setFormError(mapped.formError)
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup className="gap-4">
        <FormAlert message={formError} />
        <TextField
          label="Játékosnév"
          icon={faUser}
          name="display_name"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Játékosnév"
          description="Ezzel a névvel lépsz be a szerverre is."
          value={details.name}
          error={errors.name}
          onChange={(event) => update({ name: event.target.value })}
        />
        <TextField
          label="E-mail cím"
          icon={faEnvelope}
          name="email"
          type="email"
          placeholder="peldaemail@gmail.com"
          autoComplete="email"
          spellCheck={false}
          value={details.email}
          error={errors.email}
          onChange={(event) => update({ email: event.target.value })}
        />
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <PasswordField
            label="Jelszó"
            name="password"
            autoComplete="new-password"
            description={`Min. ${PASSWORD_MIN_LENGTH} karakter, szóköz és § nélkül.`}
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
        </div>

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

        <Button
          type="submit"
          disabled={submitting}
          className="mt-1 h-10 w-full rounded-lg text-base font-semibold shadow-[0_8px_24px_-8px_rgb(242_181_68/0.55)]"
        >
          <FontAwesomeIcon icon={faPaperPlane} aria-hidden="true" />
          {submitting ? 'Kód küldése…' : 'Kód küldése'}
        </Button>
      </FieldGroup>
    </form>
  )
}
