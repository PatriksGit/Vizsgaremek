import { faCircleExclamation } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

/** A form-wide error, such as wrong credentials or too many attempts. */
export function FormAlert({ message }: { message?: string }) {
  if (!message) return null

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-sm text-foreground"
    >
      <FontAwesomeIcon icon={faCircleExclamation} className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
      <p>{message}</p>
    </div>
  )
}
