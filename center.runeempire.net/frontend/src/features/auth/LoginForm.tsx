import { faRightToBracket, faUser } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation } from 'react-router'

import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'

import { formMessage } from './errors'
import { PasswordField, TextField } from './fields'
import { FormAlert } from './FormAlert'
import { useLogin } from './queries'
import { loginSchema, type LoginValues } from './schemas'

/** Router state the forgotten password panel leaves after a reset: the name to log in with. */
type ResetState = { username?: string } | null

export function LoginForm() {
  const login = useLogin()
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })
  const { errors, isSubmitting } = form.formState

  // This form stays mounted behind the other panels, so the name comes in later, not as a default.
  const resetUsername = (useLocation().state as ResetState)?.username
  useEffect(() => {
    if (resetUsername) {
      // The failed login that sent the player to the reset is over too.
      form.clearErrors()
      form.setValue('username', resetUsername)
      form.setValue('password', '')
      form.setFocus('password')
    }
  }, [resetUsername, form])

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      // Logged in: the login page sends the player on to the home page.
      await login.mutateAsync(values)
    } catch (error) {
      // Wrong credentials come back on the username field, but they are about both.
      form.setError('root.server', { message: formMessage(error) })
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormAlert message={errors.root?.server?.message} />
        <TextField
          label="Játékosnév"
          icon={faUser}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Játékosnév"
          error={errors.username?.message}
          {...form.register('username')}
        />
        <div className="flex flex-col gap-2">
          <PasswordField
            label="Jelszó"
            autoComplete="current-password"
            error={errors.password?.message}
            {...form.register('password')}
          />
          {/* The panel slides in on the same card, so what was typed here stays. */}
          <Link
            to="/forgot-password"
            className="self-end rounded-sm text-sm text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Elfelejtetted a jelszavad?
          </Link>
        </div>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 h-11 w-full rounded-lg text-base font-semibold md:h-10"
        >
          <FontAwesomeIcon icon={faRightToBracket} aria-hidden="true" />
          {isSubmitting ? 'Belépés…' : 'Belépés'}
        </Button>
      </FieldGroup>
    </form>
  )
}
