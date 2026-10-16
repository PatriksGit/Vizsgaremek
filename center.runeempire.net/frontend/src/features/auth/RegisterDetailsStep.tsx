import { faEnvelope, faPaperPlane, faUser } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useId, type ReactNode } from 'react'
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
  /** Back from the code step to fix the address: focus lands on the e-mail field. */
  focusEmail?: boolean
}

/** The details form; its values live in the parent's form, so they survive the code step. */
export function RegisterDetailsStep({ onSubmit, focusEmail = false }: RegisterDetailsStepProps) {
  const form = useFormContext<RegisterValues>()
  const { errors, isSubmitting } = form.formState

  useEffect(() => {
    if (focusEmail) form.setFocus('email')
  }, [focusEmail, form])

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
          description="3–16 karakter: betű, szám vagy aláhúzás. Ezzel a névvel lépsz be a szerverre is."
          error={errors.name?.message}
          {...form.register('name')}
        />
        <TextField
          label="E-mail cím"
          icon={faEnvelope}
          type="email"
          placeholder="pl. peldaemail@gmail.com"
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

        <div className="flex flex-col gap-3">
          <ConsentField name="termsAccepted">
            {(label) => (
              <>
                {label('Elfogadom')} az <LegalDialog title="Általános Szerződési Feltételek">ÁSZF-et</LegalDialog> és az{' '}
                <LegalDialog title="Adatkezelési tájékoztató">Adatkezelési tájékoztatót</LegalDialog>.
              </>
            )}
          </ConsentField>
          <ConsentField name="ageConfirmed">
            {(label) => label('Elmúltam 16 éves, vagy a szülőm hozzájárult a regisztrációhoz.')}
          </ConsentField>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="mt-1 h-11 w-full rounded-lg text-base font-semibold md:h-10"
        >
          <FontAwesomeIcon icon={faPaperPlane} aria-hidden="true" />
          {isSubmitting ? 'Kód küldése…' : 'Kód küldése'}
        </Button>
      </FieldGroup>
    </form>
  )
}

type ConsentFieldProps = {
  name: 'termsAccepted' | 'ageConfirmed'
  /**
   * The sentence beside the box. `label` wraps the part that toggles the box;
   * the rest may hold links, which a <label> must not contain.
   */
  children: (label: (text: string) => ReactNode) => ReactNode
}

/** A required checkbox with its sentence; only validated, never stored. */
function ConsentField({ name, children }: ConsentFieldProps) {
  const form = useFormContext<RegisterValues>()
  const id = useId()

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <Field orientation="horizontal" data-invalid={fieldState.error ? true : undefined}>
          <Checkbox
            id={id}
            checked={field.value}
            onCheckedChange={field.onChange}
            inputRef={field.ref}
            aria-labelledby={`${id}-text`}
            aria-describedby={fieldState.error ? `${id}-error` : undefined}
            aria-invalid={fieldState.error ? true : undefined}
            // The default border disappears on the dark glass.
            className="mt-0.5 size-5 border-white/40 bg-black/30 hover:border-white/60"
          />
          <FieldContent>
            <p id={`${id}-text`} className="text-sm leading-snug text-foreground">
              {children((text) => (
                <label htmlFor={id} className="cursor-pointer">
                  {text}
                </label>
              ))}
            </p>
            <FieldError id={`${id}-error`}>{fieldState.error?.message}</FieldError>
          </FieldContent>
        </Field>
      )}
    />
  )
}
