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
}

/** The emailed code, one box per digit (registration and forgotten password). */
export function CodeField({ id, label, control, disabled = false, success = false, onComplete }: CodeFieldProps) {
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
            maxLength={CODE_LENGTH}
            inputMode="numeric"
            pattern="^[0-9]*$"
            // A pasted "123 456" or " 123456" keeps only its digits.
            pasteTransformer={(pasted) => pasted.replace(/\D/g, '')}
            autoComplete="one-time-code"
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            onComplete={onComplete}
            disabled={disabled || success}
            aria-invalid={fieldState.error ? true : undefined}
            aria-describedby={fieldState.error ? errorId : undefined}
          >
            <InputOTPGroup className="w-full gap-2">
              {Array.from({ length: CODE_LENGTH }, (_, index) => (
                <InputOTPSlot
                  key={index}
                  index={index}
                  className={cn(
                    'h-12 flex-1 rounded-lg border border-white/10 bg-black/40 text-xl font-semibold text-foreground tabular-nums shadow-[inset_0_1px_3px_rgb(0_0_0/0.35)] first:rounded-lg last:rounded-lg',
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
