import { faRightToBracket, faUser } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'

import { PasswordField, TextField } from './fields'
import { hasErrors, type FieldErrors } from './validation'

type LoginField = 'username' | 'password'

export function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors<LoginField>>({})

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    // Only emptiness is checked here: the backend answers every other mistake
    // with the same "wrong name or password" message.
    const nextErrors: FieldErrors<LoginField> = {
      username: username ? undefined : 'Add meg a játékosneved.',
      password: password ? undefined : 'Add meg a jelszavad.',
    }
    setErrors(nextErrors)
    if (hasErrors(nextErrors)) return

    // TODO: POST /api/auth/login once the frontend is wired to the backend.
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
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
        <Button type="submit" className="mt-2 h-10 w-full rounded-lg text-base font-semibold shadow-[0_8px_24px_-8px_rgb(242_181_68/0.55)]">
          <FontAwesomeIcon icon={faRightToBracket} aria-hidden="true" />
          Belépés
        </Button>
      </FieldGroup>
    </form>
  )
}
