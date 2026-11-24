import { faKey, faShieldHalved } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { ApiError } from '@/lib/api'

import { applyApiError } from './errors'
import { PasswordField, TextField } from './fields'
import { FormAlert } from './FormAlert'
import { useFromState } from './fromState'
import { useResetPassword } from './queries'
import { newPasswordSchema, PASSWORD_HINT, TOTP_LENGTH, totpSchema, type NewPasswordValues } from './schemas'
import { submitButtonClass } from './styles'

type ForgotNewPasswordStepProps = {
  /** The verified account has 2FA: its authenticator code is asked too (2026-11-22). */
  twoFactorRequired: boolean
  /** The password changed: the panel starts over empty. */
  onDone: () => void
  /** The permission ran out (auth.reset_expired): back to the address, with the backend's message. */
  onExpired: (message: string) => void
}

/**
 * The forgotten password panel's last step: the new password twice (and the 2FA code). It is on
 * screen only after the code checked out, so nothing typed here outlives the step.
 */
export function ForgotNewPasswordStep({ twoFactorRequired, onDone, onExpired }: ForgotNewPasswordStepProps) {
  const navigate = useNavigate()
  // The page the player is on: a reset answered after they moved on does not pull them back (AU-2).
  const { key } = useLocation()
  const here = useRef<string | null>(key)
  useEffect(() => {
    here.current = key
    // The step is gone: the player left the card (Vissza to Beállítások), or the panel started over.
    return () => {
      here.current = null
    }
  }, [key])
  const resetPassword = useResetPassword()
  const fromState = useFromState()
  const form = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '', passwordConfirmation: '', twoFactorCode: '' },
  })
  const { errors, isSubmitting } = form.formState
  // Set before a request starts, so a second submit in the same moment sends nothing.
  const saving = useRef(false)

  // The step appears once the code checked out: the keyboard goes to the new password.
  useEffect(() => form.setFocus('password'), [form])

  const onPassword = async (values: NewPasswordValues) => {
    if (saving.current) return
    const twoFactorCode = values.twoFactorCode?.replace(/\s/g, '') ?? ''
    if (twoFactorRequired && !totpSchema.safeParse({ code: twoFactorCode }).success) {
      form.setError('twoFactorCode', { message: `Írd be a hitelesítő alkalmazásban látható ${TOTP_LENGTH} jegyű kódot.` })
      return
    }
    saving.current = true
    const from = here.current
    try {
      const { username, account } = await resetPassword.mutateAsync({
        password: values.password,
        passwordConfirmation: values.passwordConfirmation,
        ...(twoFactorRequired ? { twoFactorCode } : {}),
      })
      // Read before onDone: starting over unmounts this step, and its cleanup forgets the page.
      const stayed = here.current === from
      // The panel stays mounted beside the login: nothing of this reset, the new password least of all, stays in it.
      onDone()
      toast.success('Megváltozott a jelszavad, most már beléphetsz.')
      if (!stayed) return
      // Logged out (the reset ended this account's session, or nobody was logged in): log in with the new one.
      // A guest keeps the page they asked for before the login (auth K2).
      navigate(account ? '/' : '/login', { state: account ? null : { ...fromState, username } })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'auth.reset_expired') {
        // The permission ran out: start again from the address.
        onExpired(error.message)
        return
      }
      applyApiError(error, form.setError, { password: 'password', two_factor_code: 'twoFactorCode' })
    } finally {
      saving.current = false
    }
  }

  return (
    <form onSubmit={(event) => void form.handleSubmit(onPassword)(event)} noValidate>
      <FieldGroup className="gap-4">
        <FormAlert message={errors.root?.server?.message} />
        <PasswordField
          label="Új jelszó"
          autoComplete="new-password"
          description={PASSWORD_HINT}
          error={errors.password?.message}
          {...form.register('password')}
        />
        <PasswordField
          label="Új jelszó újra"
          autoComplete="new-password"
          error={errors.passwordConfirmation?.message}
          {...form.register('passwordConfirmation')}
        />
        {twoFactorRequired && (
          <TextField
            label="Kód a hitelesítő alkalmazásból"
            icon={faShieldHalved}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={TOTP_LENGTH + 1}
            placeholder="000000"
            description="A fiókodon kétlépcsős azonosítás van bekapcsolva, ezért a kódját is kérjük."
            error={errors.twoFactorCode?.message}
            {...form.register('twoFactorCode')}
          />
        )}
        <Button type="submit" disabled={isSubmitting} className={submitButtonClass}>
          <FontAwesomeIcon icon={faKey} aria-hidden="true" />
          {isSubmitting ? 'Mentés…' : 'Jelszó mentése'}
        </Button>
      </FieldGroup>
    </form>
  )
}
