import { faRightToBracket, faUser } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'

import { formMessage } from './errors'
import { PasswordField, TextField } from './fields'
import { FormAlert } from './FormAlert'
import { useLogin } from './queries'
import { loginSchema, type LoginValues } from './schemas'

export function LoginForm() {
  const login = useLogin()
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })
  const { errors, isSubmitting } = form.formState

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
          {/* A link would leave the page and lose what was typed; the reset page does not exist yet. */}
          <button
            type="button"
            onClick={() => toast.info('A jelszó-visszaállítás hamarosan érkezik.')}
            className="self-end rounded-sm text-sm text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Elfelejtetted a jelszavad?
          </button>
        </div>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 h-10 w-full rounded-lg text-base font-semibold shadow-[0_8px_24px_-8px_rgb(242_181_68/0.55)]"
        >
          <FontAwesomeIcon icon={faRightToBracket} aria-hidden="true" />
          {isSubmitting ? 'Belépés…' : 'Belépés'}
        </Button>
      </FieldGroup>
    </form>
  )
}
