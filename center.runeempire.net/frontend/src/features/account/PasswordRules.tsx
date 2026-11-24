import { faCheck, faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import { ALLOWED_PASSWORD_PATTERN, PASSWORD_EXAMPLE, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/features/auth/schemas'
import { cn } from '@/lib/utils'

/**
 * The password policy as the player types (PlayablePassword on the backend):
 * the site's real rules, not the design's upper case / digit / symbol ones.
 */
function passwordRules(value: string) {
  const typed = value.length > 0
  // Spaces are the second rule: the third one is only about the other characters.
  const withoutSpaces = value.replace(/\s/g, '')
  return [
    {
      label: `${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} karakter`,
      ok: value.length >= PASSWORD_MIN_LENGTH && value.length <= PASSWORD_MAX_LENGTH,
    },
    { label: 'Szóköz nélkül', ok: typed && !/\s/.test(value) },
    {
      label: 'Magyar vagy angol betűk, számok, alap jelek',
      example: PASSWORD_EXAMPLE,
      ok: typed && (withoutSpaces === '' || ALLOWED_PASSWORD_PATTERN.test(withoutSpaces)),
    },
  ]
}

/**
 * The live checklist under the new password, inside the field's description so
 * it is read with the field; its last line says what saving does to the other
 * devices (owner, 2026-11-22: there, not in a footer).
 */
export function PasswordRules({ value }: { value: string }) {
  return (
    <span className="flex flex-col gap-1.5">
      {passwordRules(value).map((rule) => (
        <span
          key={rule.label}
          className={cn('flex items-start gap-2 text-[13px]', rule.ok ? 'text-soft' : 'text-muted-foreground')}
        >
          {rule.ok ? (
            <FontAwesomeIcon icon={faCheck} aria-hidden="true" className="mt-0.5 size-3.5 flex-none text-ok" />
          ) : (
            <span aria-hidden="true" className="mt-0.5 flex size-3.5 flex-none items-center justify-center">
              <span className="size-1.25 rounded-full bg-faint" />
            </span>
          )}
          <span>
            {rule.label}
            {'example' in rule && ` ${rule.example}`}
          </span>
          <span className="sr-only">{rule.ok ? ' – teljesül' : ' – még nem teljesül'}</span>
        </span>
      ))}
      <span className="flex items-start gap-2 text-[13px] text-muted-foreground">
        <FontAwesomeIcon icon={faCircleInfo} aria-hidden="true" className="mt-0.5 size-3.5 flex-none text-faint" />
        Mentés után kijelentkeztetünk a többi eszközről.
      </span>
    </span>
  )
}
