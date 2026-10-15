import { faEnvelope, faPaperPlane, faUser } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useId } from 'react'
import { Controller, useFormContext } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldContent, FieldError, FieldGroup } from '@/components/ui/field'

import { applyApiError } from './errors'
import { PasswordField, TextField } from './fields'
import { FormAlert } from './FormAlert'
import { LegalDialog } from './LegalDialog'
import { PASSWORD_MIN_LENGTH, registerFieldForKey, type RegisterValues } from './schemas'

type RegisterDetailsStepProps = {
  /** Sends the details; resolves once the code is on its way. */
  onSubmit: (values: RegisterValues) => Promise<void>
}

/** The details form; its values live in the parent's form, so they survive the code step. */
export function RegisterDetailsStep({ onSubmit }: RegisterDetailsStepProps) {
  const form = useFormContext<RegisterValues>()
  const { errors, isSubmitting } = form.formState
  const termsId = useId()

  const submit = form.handleSubmit(async (values) => {
    try {
      // On success the parent moves on to the code step, which unmounts this form.
      await onSubmit(values)
    } catch (error) {
      applyApiError(error, form.setError, registerFieldForKey)
    }
  })

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup className="gap-4">
        <FormAlert message={errors.root?.server?.message} />
        <TextField
          label="Játékosnév"
          icon={faUser}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Játékosnév"
          description="Ezzel a névvel lépsz be a szerverre is."
          error={errors.name?.message}
          {...form.register('name')}
        />
        <TextField
          label="E-mail cím"
          icon={faEnvelope}
          type="email"
          placeholder="peldaemail@gmail.com"
          autoComplete="email"
          spellCheck={false}
          error={errors.email?.message}
          {...form.register('email')}
        />
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <PasswordField
            label="Jelszó"
            autoComplete="new-password"
            description={`Min. ${PASSWORD_MIN_LENGTH} karakter, szóköz és § nélkül.`}
            error={errors.password?.message}
            {...form.register('password')}
          />
          <PasswordField
            label="Jelszó újra"
            autoComplete="new-password"
            error={errors.passwordConfirmation?.message}
            {...form.register('passwordConfirmation')}
          />
        </div>

        <Controller
          control={form.control}
          name="termsAccepted"
          render={({ field, fieldState }) => (
            <Field orientation="horizontal" data-invalid={fieldState.error ? true : undefined}>
              <Checkbox
                id={termsId}
                checked={field.value}
                onCheckedChange={field.onChange}
                inputRef={field.ref}
                aria-labelledby={`${termsId}-text`}
                aria-describedby={fieldState.error ? `${termsId}-error` : undefined}
                aria-invalid={fieldState.error ? true : undefined}
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
                <FieldError id={`${termsId}-error`}>{fieldState.error?.message}</FieldError>
              </FieldContent>
            </Field>
          )}
        />

        <Button
          type="submit"
          disabled={isSubmitting}
          className="mt-1 h-10 w-full rounded-lg text-base font-semibold shadow-[0_8px_24px_-8px_rgb(242_181_68/0.55)]"
        >
          <FontAwesomeIcon icon={faPaperPlane} aria-hidden="true" />
          {isSubmitting ? 'Kód küldése…' : 'Kód küldése'}
        </Button>
      </FieldGroup>
    </form>
  )
}
