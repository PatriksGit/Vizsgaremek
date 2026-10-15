import { faRightToBracket, faUser } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'

import { login } from './api'
import { useAuth } from './authContext'
import { formMessage } from './errors'
import { PasswordField, TextField } from './fields'
import { FormAlert } from './FormAlert'
import { hasErrors, type FieldErrors } from './validation'

type LoginField = 'username' | 'password'

export function LoginForm() {
  const { setAccount } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors<LoginField>>({})
  const [formError, setFormError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    // Only emptiness is checked here: the backend answers every other mistake
    // with the same "wrong name or password" message.
    const nextErrors: FieldErrors<LoginField> = {
      username: username ? undefined : 'Add meg a játékosneved.',
      password: password ? undefined : 'Add meg a jelszavad.',
    }
    setErrors(nextErrors)
    setFormError(undefined)
    if (hasErrors(nextErrors)) return

    setSubmitting(true)
    try {
      // Logged in: the login page sends the player on to the home page.
      setAccount(await login(username, password))
    } catch (error) {
      // Wrong credentials come back on the username field, but they are about both.
      setFormError(formMessage(error))
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        <FormAlert message={formError} />
        <TextField
          label="Játékosnév"
          icon={faUser}
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Játékosnév"
          value={username}
          error={errors.username}
          onChange={(event) => setUsername(event.target.value)}
        />
        <div className="flex flex-col gap-2">
          <PasswordField
            label="Jelszó"
            name="password"
            autoComplete="current-password"
            value={password}
            error={errors.password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {/* TODO: the password reset page does not exist yet. */}
          <Link
            to="/forgot-password"
            className="self-end rounded-sm text-sm text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Elfelejtetted a jelszavad?
          </Link>
        </div>
        <Button
          type="submit"
          disabled={submitting}
          className="mt-2 h-10 w-full rounded-lg text-base font-semibold shadow-[0_8px_24px_-8px_rgb(242_181_68/0.55)]"
        >
          <FontAwesomeIcon icon={faRightToBracket} aria-hidden="true" />
          {submitting ? 'Belépés…' : 'Belépés'}
        </Button>
      </FieldGroup>
    </form>
  )
}
