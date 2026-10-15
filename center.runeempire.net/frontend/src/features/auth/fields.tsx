import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faEye, faEyeSlash, faLock } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useId, useState, type ComponentProps, type ReactNode } from 'react'

import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type TextFieldProps = Omit<ComponentProps<'input'>, 'id'> & {
  label: string
  /** Shown inside the input, at its left edge. */
  icon?: IconDefinition
  /** Placed next to the label, at its right edge (e.g. a "forgot password" link). */
  labelAside?: ReactNode
  description?: ReactNode
  error?: string
  /** Placed inside the input, at its right edge. */
  trailing?: ReactNode
}

/** A labelled glass input, with its hint or error below. */
export function TextField({
  label,
  icon,
  labelAside,
  description,
  error,
  trailing,
  className,
  ...inputProps
}: TextFieldProps) {
  const id = useId()
  const hintId = `${id}-hint`

  return (
    <Field data-invalid={error ? true : undefined}>
      <div className="flex items-baseline justify-between gap-4">
        <FieldLabel htmlFor={id} className="text-foreground">
          {label}
        </FieldLabel>
        {labelAside}
      </div>
      <div className="relative">
        {icon && (
          <FontAwesomeIcon
            icon={icon}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
        )}
        <Input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || description ? hintId : undefined}
          className={cn(
            'h-11 rounded-lg border-white/10 bg-black/25 px-3.5 text-base text-foreground shadow-[inset_0_1px_3px_rgb(0_0_0/0.35)] md:text-base',
            icon && 'pl-10',
            trailing && 'pr-12',
            className,
          )}
          {...inputProps}
        />
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>
      {error ? (
        <FieldError id={hintId}>{error}</FieldError>
      ) : (
        description && <FieldDescription id={hintId}>{description}</FieldDescription>
      )}
    </Field>
  )
}

type PasswordFieldProps = Omit<TextFieldProps, 'type' | 'trailing' | 'icon'>

export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <TextField
      {...props}
      icon={faLock}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Jelszó elrejtése' : 'Jelszó megjelenítése'}
          aria-pressed={visible}
          className="grid size-9 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <FontAwesomeIcon icon={visible ? faEyeSlash : faEye} className="size-4" />
        </button>
      }
    />
  )
}
