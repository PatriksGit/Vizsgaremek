import { zodResolver } from '@hookform/resolvers/zod'
import { faKey } from '@fortawesome/free-solid-svg-icons'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { changePassword } from '@/features/account/api'
import { applyApiError } from '@/features/auth/errors'
import { PasswordField } from '@/features/auth/fields'
import { FormAlert } from '@/features/auth/FormAlert'
import { changePasswordSchema, type ChangePasswordValues } from '@/features/auth/schemas'
import { cn } from '@/lib/utils'

import { PasswordRules } from './PasswordRules'
import { SettingsRow } from './SettingsRow'

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
  const toggle = useRef<HTMLButtonElement>(null)
  const formBox = useRef<HTMLFormElement>(null)
  // Closed from inside the form: the focused Mégse / Mentés turns inert, so the keyboard goes back to the toggle.
  const refocusToggle = useRef(false)

  useEffect(() => {
    if (open) form.setFocus('currentPassword')
    else if (refocusToggle.current) {
      refocusToggle.current = false
      toggle.current?.focus()
    }
  }, [open, form])

  const close = () => {
    const focused = document.activeElement
    // body: the Mentés button that was focused got disabled while saving and lost the focus.
    refocusToggle.current = focused === document.body || Boolean(formBox.current?.contains(focused))
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
          <Button ref={toggle} variant="outline" onClick={() => setOpen(true)} className="h-10 rounded-full px-4.5 font-bold max-sm:w-full">
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
        {/* 12 px of room each side, so the clip does not cut "Elfelejtetted?"'s 44 px tap area and focus ring on phones
            (review 2026-11-24 VI-14); the negative margin keeps the layout where it was. */}
        <div className="-mx-3 min-h-0 overflow-hidden px-3">
          <form ref={formBox} onSubmit={(event) => void form.handleSubmit(onSubmit)(event)} noValidate className="pt-5 sm:pl-14">
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
                  className="absolute top-0 right-0 text-xs font-bold text-primary hover:text-primary/80 max-md:-top-4.5 max-md:-right-2 max-md:px-2 max-md:pt-4.5 max-md:pb-2.5"
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
