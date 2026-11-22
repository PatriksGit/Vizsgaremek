import { zodResolver } from '@hookform/resolvers/zod'
import { faCheck, faKey } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { panelLook } from '@/components/app/Panel'
import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { changePassword } from '@/features/auth/api'
import { applyApiError } from '@/features/auth/errors'
import { PasswordField } from '@/features/auth/fields'
import { FormAlert } from '@/features/auth/FormAlert'
import {
  ALLOWED_PASSWORD_PATTERN,
  changePasswordSchema,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  type ChangePasswordValues,
} from '@/features/auth/schemas'
import { enterAfter } from '@/lib/motion'
import { cn } from '@/lib/utils'

/**
 * The password policy as the player types (PlayablePassword on the backend):
 * the design's checklist, with the site's real rules instead of the design's
 * upper case / digit / symbol ones (owner, 2026-11-22).
 */
function passwordRules(value: string) {
  const typed = value.length > 0
  // Spaces are the second rule: the third one is only about the other characters.
  const withoutSpaces = value.replace(/\s/g, '')
  return [
    { label: `${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} karakter`, ok: value.length >= PASSWORD_MIN_LENGTH && value.length <= PASSWORD_MAX_LENGTH },
    { label: 'Szóköz nélkül', ok: typed && !/\s/.test(value) },
    {
      label: 'Magyar vagy angol betűk, számok, egyszerű szimbólumok',
      ok: typed && (withoutSpaces === '' || ALLOWED_PASSWORD_PATTERN.test(withoutSpaces)),
    },
  ]
}

/** The live checklist under the new password; inside the field's description, so it is read with the field. */
function PasswordRules({ value }: { value: string }) {
  return (
    // One rule per line: side by side, the longest one broke in two in the half-width column.
    <span className="flex flex-col gap-1.5">
      {passwordRules(value).map((rule) => (
        <span key={rule.label} className={cn('flex items-start gap-1.5 text-[13px]', rule.ok ? 'text-soft' : 'text-muted-foreground')}>
          {rule.ok ? (
            <FontAwesomeIcon icon={faCheck} aria-hidden="true" className="mt-0.5 size-3.5 flex-none text-ok" />
          ) : (
            <span aria-hidden="true" className="mt-0.5 flex size-3.5 flex-none items-center justify-center">
              <span className="size-1.25 rounded-full bg-faint" />
            </span>
          )}
          {rule.label}
          <span className="sr-only">{rule.ok ? ' – teljesül' : ' – még nem teljesül'}</span>
        </span>
      ))}
    </span>
  )
}

const empty: ChangePasswordValues = { currentPassword: '', password: '', passwordConfirmation: '' }

/**
 * Jelszó módosítása (the owner's design "Asztali/Mobil – Beállítások"): the
 * current password with the way to /forgot-password, then the new one twice.
 * The backend always ends the account's other sessions, so the design's
 * "log out every other device" checkbox is a plain line instead, and there is
 * no "last changed" date (nothing stores it).
 */
export function PasswordCard({ username, enterDelay }: { username: string; enterDelay: number }) {
  const form = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema), defaultValues: empty })
  const newPassword = useWatch({ control: form.control, name: 'password' })
  const { errors, isSubmitting } = form.formState

  const onSubmit = async (values: ChangePasswordValues) => {
    try {
      await changePassword(values)
      // Nothing of the passwords stays in the page.
      form.reset(empty)
      toast.success('Megváltozott a jelszavad. A többi eszközödről kijelentkeztettünk.')
    } catch (error) {
      applyApiError(error, form.setError, {
        current_password: 'currentPassword',
        password: 'password',
        password_confirmation: 'passwordConfirmation',
      })
    }
  }

  return (
    <section aria-labelledby="password-title" style={enterAfter(enterDelay)} className={cn(panelLook, 'content-in overflow-hidden p-0')}>
      <form onSubmit={(event) => void form.handleSubmit(onSubmit)(event)} noValidate>
        <div className="flex flex-col gap-5 p-5 md:p-6">
          <div>
            <h2 id="password-title" className="font-heading text-lg font-bold text-foreground md:text-xl">
              Jelszó módosítása
            </h2>
            <p className="mt-1.5 max-w-[62ch] text-sm text-muted-foreground">Ugyanezt a jelszót használod a szerveren való belépéshez is.</p>
          </div>

          {/* For password managers: which account the new password belongs to. */}
          <input type="text" name="username" autoComplete="username" value={username} readOnly hidden />

          <FieldGroup className="grid max-w-180 gap-4 md:grid-cols-2 md:gap-x-5">
            <FormAlert message={errors.root?.server?.message} />
            <div className="relative md:col-span-2 md:max-w-[calc(50%-0.625rem)]">
              <PasswordField
                label="Jelenlegi jelszó"
                autoComplete="current-password"
                error={errors.currentPassword?.message}
                {...form.register('currentPassword')}
              />
              {/* Beside the label, outside it, so the label stays the field's whole name. */}
              <Link to="/forgot-password" className="absolute top-0 right-0 text-xs font-bold text-primary hover:text-primary/80">
                Elfelejtetted?
              </Link>
            </div>
            <PasswordField
              label="Új jelszó"
              autoComplete="new-password"
              description={<PasswordRules value={newPassword} />}
              error={errors.password?.message}
              {...form.register('password')}
            />
            <PasswordField
              label="Új jelszó még egyszer"
              autoComplete="new-password"
              error={errors.passwordConfirmation?.message}
              {...form.register('passwordConfirmation')}
              className="md:self-start"
            />
          </FieldGroup>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-sunken/60 px-5 py-3.5 md:px-6">
          <span className="text-xs text-faint">A módosítás után a többi eszközödről kijelentkeztetünk.</span>
          <Button type="submit" disabled={isSubmitting} className="h-10 rounded-full px-5 text-sm font-extrabold">
            <FontAwesomeIcon icon={faKey} aria-hidden="true" />
            {isSubmitting ? 'Mentés…' : 'Jelszó módosítása'}
          </Button>
        </footer>
      </form>
    </section>
  )
}
