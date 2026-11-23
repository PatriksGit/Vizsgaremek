import { zodResolver } from '@hookform/resolvers/zod'
import { faCheck, faCircleInfo, faKey } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router'
import { toast } from 'sonner'

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
import { cn } from '@/lib/utils'

import { SettingsRow } from './SettingsRow'

/**
 * The password policy as the player types (PlayablePassword on the backend):
 * the site's real rules, not the design's upper case / digit / symbol ones.
 */
function passwordRules(value: string) {
  const typed = value.length > 0
  // Spaces are the second rule: the third one is only about the other characters.
  const withoutSpaces = value.replace(/\s/g, '')
  return [
    {
      label: `${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} karakter`,
      ok: value.length >= PASSWORD_MIN_LENGTH && value.length <= PASSWORD_MAX_LENGTH,
    },
    { label: 'Szóköz nélkül', ok: typed && !/\s/.test(value) },
    {
      label: 'Magyar vagy angol betűk, számok, alap jelek',
      // Kept on one line: the examples broke apart at the column's edge.
      example: '(pl. ! @ # _ -)',
      ok: typed && (withoutSpaces === '' || ALLOWED_PASSWORD_PATTERN.test(withoutSpaces)),
    },
  ]
}

/**
 * The live checklist under the new password, inside the field's description so
 * it is read with the field; its last line says what saving does to the other
 * devices (owner, 2026-11-22: there, not in a footer).
 */
function PasswordRules({ value }: { value: string }) {
  return (
    <span className="flex flex-col gap-1.5">
      {passwordRules(value).map((rule) => (
        <span
          key={rule.label}
          className={cn('flex items-start gap-2 text-[13px]', rule.ok ? 'text-soft' : 'text-muted-foreground')}
        >
          {rule.ok ? (
            <FontAwesomeIcon icon={faCheck} aria-hidden="true" className="mt-0.5 size-3.5 flex-none text-ok" />
          ) : (
            <span aria-hidden="true" className="mt-0.5 flex size-3.5 flex-none items-center justify-center">
              <span className="size-1.25 rounded-full bg-faint" />
            </span>
          )}
          <span>
            {rule.label}
            {'example' in rule && <span className="whitespace-nowrap"> {rule.example}</span>}
          </span>
          <span className="sr-only">{rule.ok ? ' – teljesül' : ' – még nem teljesül'}</span>
        </span>
      ))}
      <span className="flex items-start gap-2 text-[13px] text-muted-foreground">
        <FontAwesomeIcon icon={faCircleInfo} aria-hidden="true" className="mt-0.5 size-3.5 flex-none text-faint" />
        Mentés után kijelentkeztetünk a többi eszközről.
      </span>
    </span>
  )
}

const empty: ChangePasswordValues = { currentPassword: '', password: '', passwordConfirmation: '' }

/**
 * The password row of the Biztonság card: "Jelszó módosítása" opens the form
 * under it (owner, 2026-11-22). Saving closes it again; nothing of the
 * passwords stays in the page.
 */
export function PasswordRow({ username }: { username: string }) {
  const [open, setOpen] = useState(false)
  const form = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema), defaultValues: empty })
  // A mutation, so a 401 reaches the MutationCache and forgets the account (src/queryClient.ts).
  const change = useMutation({ mutationFn: changePassword })
  const newPassword = useWatch({ control: form.control, name: 'password' })
  const { errors, isSubmitting } = form.formState
  // Bumped on every close: a refusal that arrives after Mégse belongs to no opening.
  const opening = useRef(0)

  useEffect(() => {
    if (open) form.setFocus('currentPassword')
  }, [open, form])

  const close = () => {
    opening.current += 1
    form.reset(empty)
    setOpen(false)
  }

  const onSubmit = async (values: ChangePasswordValues) => {
    const mine = opening.current
    try {
      await change.mutateAsync(values)
      close()
      toast.success('Megváltozott a jelszavad. A többi eszközödről kijelentkeztettünk.')
    } catch (error) {
      if (mine !== opening.current) return
      applyApiError(error, form.setError, {
        current_password: 'currentPassword',
        password: 'password',
      })
    }
  }

  return (
    <SettingsRow
      id="password-title"
      icon={faKey}
      title="Jelszó"
      description="Ezzel a jelszóval lépsz be a szerverre is."
      action={
        !open && (
          <Button variant="outline" onClick={() => setOpen(true)} className="h-10 rounded-full px-4.5 font-bold max-sm:w-full">
            Jelszó módosítása
          </Button>
        )
      }
    >
      {/*
        Slides open and shut (owner, 2026-11-22: it jumped open): a grid row from 0fr to 1fr animates to the form's own
        height. Not Base UI's Collapsible: it started closing only ~400 ms after Mégse (Playwright). Closed, the form
        stays in the page but inert, so neither Tab nor a screen reader reaches it.
      */}
      <div
        inert={!open}
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-250 ease-out motion-reduce:transition-none',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <form onSubmit={(event) => void form.handleSubmit(onSubmit)(event)} noValidate className="pt-5 sm:pl-14">
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
                <Link
                  to="/forgot-password"
                  className="absolute top-0 right-0 text-xs font-bold text-primary hover:text-primary/80"
                >
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
                label="Új jelszó újra"
                autoComplete="new-password"
                error={errors.passwordConfirmation?.message}
                {...form.register('passwordConfirmation')}
                className="md:self-start"
              />
            </FieldGroup>

            <div className="mt-5 flex max-w-180 justify-end gap-2.5">
              <Button type="button" variant="outline" onClick={close} className="h-10 rounded-full px-4.5 font-bold">
                Mégse
              </Button>
              <Button type="submit" disabled={isSubmitting} className="h-10 rounded-full px-5 font-extrabold">
                {isSubmitting ? 'Mentés…' : 'Mentés'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </SettingsRow>
  )
}
