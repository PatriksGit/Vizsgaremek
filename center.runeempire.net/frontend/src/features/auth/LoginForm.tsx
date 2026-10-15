import { faRightToBracket, faUser } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'

import { PasswordField, TextField } from './fields'
import { hasErrors, type FieldErrors } from './validation'

type LoginField = 'username' | 'password'

/** onNameChange reports the typed name, for the rune inscription. */
export function LoginForm({ onNameChange }: { onNameChange: (name: string) => void }) {
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
          placeholder="pl. PatrikT"
          value={username}
          error={errors.username}
          onChange={(event) => {
            setUsername(event.target.value)
            onNameChange(event.target.value)
          }}
        />
        <PasswordField
          label="Jelszó"
          labelAside={
            // TODO: the password reset page does not exist yet.
            <Link
              to="/forgot-password"
              className="rounded-sm text-sm text-muted-foreground outline-none transition-colors hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Elfelejtetted?
            </Link>
          }
          name="password"
          autoComplete="current-password"
          value={password}
          error={errors.password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Button type="submit" className="mt-2 h-11 w-full rounded-lg text-base font-semibold shadow-[0_8px_24px_-8px_rgb(242_181_68/0.55)]">
          <FontAwesomeIcon icon={faRightToBracket} aria-hidden="true" />
          Belépés
        </Button>
      </FieldGroup>
    </form>
  )
}
