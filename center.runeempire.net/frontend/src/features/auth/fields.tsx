import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faEye, faEyeSlash, faLock } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useId, useState, type ComponentProps, type ReactNode } from 'react'

import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

import { linkButtonClass } from './styles'

type TextFieldProps = Omit<ComponentProps<'input'>, 'id'> & {
  label: string
  /** Shown inside the input, at its left edge. */
  icon?: IconDefinition
  description?: ReactNode
  error?: string
  /** Placed inside the input, at its right edge. */
  trailing?: ReactNode
}

/**
 * The bot trap (owner, 2026-11-16): a checkbox no person sees, reaches with Tab
 * or hears from a screen reader. A form-filling bot that ticks it gets a
 * normal-looking answer from the backend, but nothing is mailed.
 */
export function HoneypotField(props: Omit<ComponentProps<'input'>, 'type'>) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] top-0 size-px overflow-hidden">
      <label>
        Kérek hírlevelet
        <input type="checkbox" tabIndex={-1} autoComplete="off" {...props} />
      </label>
    </div>
  )
}

/**
 * "Már megkaptad a kódot? Írd be" after the cooldown's 429 (a code went to this
 * address a moment ago): shown only while the typed address is the one it came for.
 */
type CodeMayBeOutHintProps = {
  /** The address the cooldown's 429 came for; null: no hint. */
  offeredFor: string | null
  /** The address in the field now. */
  typed: string
  onEnter: (email: string) => void
}

export function CodeMayBeOutHint({ offeredFor, typed, onEnter }: CodeMayBeOutHintProps) {
  if (offeredFor === null || offeredFor !== typed.trim().toLowerCase()) return null

  return (
    <p className="text-sm text-muted-foreground">
      Már megkaptad a kódot?{' '}
      <button type="button" onClick={() => onEnter(offeredFor)} className={linkButtonClass}>
        Írd be
      </button>
    </p>
  )
}

/** A labelled glass input, with its hint or error below. */
export function TextField({
  label,
  icon,
  description,
  error,
  trailing,
  className,
  ...inputProps
}: TextFieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [description && hintId, error && errorId].filter(Boolean).join(' ') || undefined

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id} className="text-foreground">
        {label}
      </FieldLabel>
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
          aria-describedby={describedBy}
          className={cn(
            'h-11 rounded-lg border-white/10 bg-black/40 px-3.5 text-base text-foreground shadow-[inset_0_1px_3px_rgb(0_0_0/0.35)] md:h-10 md:text-base',
            icon && 'pl-10',
            trailing && 'pr-12',
            className,
          )}
          {...inputProps}
        />
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>
      {description && <FieldDescription id={hintId}>{description}</FieldDescription>}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  )
}

type PasswordFieldProps = Omit<TextFieldProps, 'type' | 'trailing' | 'icon'>

export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <TextField
      placeholder="••••••••"
      {...props}
      icon={faLock}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Jelszó elrejtése' : 'Jelszó megjelenítése'}
          className="grid size-10 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <FontAwesomeIcon icon={visible ? faEyeSlash : faEye} className="size-4" />
        </button>
      }
    />
  )
}
