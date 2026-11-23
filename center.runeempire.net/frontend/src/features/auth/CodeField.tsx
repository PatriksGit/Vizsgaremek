import { Check } from 'lucide-react'
import { Controller, type Control } from 'react-hook-form'

import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { cn } from '@/lib/utils'

import { CODE_LENGTH, type CodeValues } from './schemas'

type CodeFieldProps = {
  id: string
  label: string
  control: Control<CodeValues>
  disabled?: boolean
  /** The code checked out: green, locked, with a check mark. */
  success?: boolean
  /** Called once the last digit is typed (or a whole code is pasted). */
  onComplete?: (code: string) => void
  /** Digits: the e-mail code's by default; an authenticator code is TOTP_LENGTH. */
  length?: number
}

/** A code, one box per digit: the e-mailed code (registration, forgotten password) or an authenticator app's. */
export function CodeField({ id, label, control, disabled = false, success = false, onComplete, length = CODE_LENGTH }: CodeFieldProps) {
  const errorId = `${id}-error`

  return (
    <Controller
      control={control}
      name="code"
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.error ? true : undefined}>
          <FieldLabel htmlFor={id} className="text-foreground">
            {label}
            {success && <Check className="size-4 text-ok" strokeWidth={3} aria-label="Elfogadva" />}
          </FieldLabel>
          <InputOTP
            id={id}
            ref={field.ref}
            maxLength={length}
            inputMode="numeric"
            pattern="^[0-9]*$"
            // A pasted "123 456" or " 123456" keeps only its digits.
            pasteTransformer={(pasted) => pasted.replace(/\D/g, '')}
            autoComplete="one-time-code"
            // No 40 px "password manager badge" room: measured mid-zoom it made the dialogs scroll sideways (V5).
            pushPasswordManagerStrategy="none"
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            onComplete={onComplete}
            disabled={disabled || success}
            aria-invalid={fieldState.error ? true : undefined}
            aria-describedby={fieldState.error ? errorId : undefined}
          >
            <InputOTPGroup className="w-full justify-center gap-2 sm:gap-2.5">
              {Array.from({ length }, (_, index) => (
                <InputOTPSlot
                  key={index}
                  index={index}
                  className={cn(
                    // Squares (owner, 2026-11-22: not long bars), at most 56 px, shrinking together on a narrow phone.
                    'aspect-square size-auto max-w-14 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 text-2xl font-semibold text-foreground tabular-nums shadow-[inset_0_1px_3px_rgb(0_0_0/0.35)] first:rounded-xl last:rounded-xl',
                    fieldState.error && 'border-destructive',
                    success && 'border-ok text-ok',
                  )}
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
          <FieldError id={errorId}>{fieldState.error?.message}</FieldError>
        </Field>
      )}
    />
  )
}
