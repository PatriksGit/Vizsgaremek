import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { ReactNode } from 'react'

type SettingsRowProps = {
  id: string
  icon: IconDefinition
  title: string
  /** Beside the title, such as the 2FA state. */
  badge?: ReactNode
  /** A node, so a word can be kept whole (a nowrap span). */
  description: ReactNode
  /** The row's one action (a caller with a form, like PasswordRow, leaves it out while the form is open). */
  action?: ReactNode
  /** What opens under the row, such as the password form. */
  children?: ReactNode
}

/**
 * One way of logging in in the Biztonság card (owner, 2026-11-22, the modern
 * account page pattern): an icon, what it is, one action on the right.
 */
export function SettingsRow({ id, icon, title, badge, description, action, children }: SettingsRowProps) {
  return (
    <section aria-labelledby={id} className="px-5 py-5 md:px-6">
      {/* The icon never wraps: only the action does, under the text, not under the icon (320-353 px, review 2026-11-24 AC-3). */}
      <div className="flex items-start gap-4">
        <span aria-hidden="true" className="flex size-10 flex-none items-center justify-center rounded-xl bg-raised text-soft">
          <FontAwesomeIcon icon={icon} className="size-4" />
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-start gap-x-4 gap-y-3">
          <div className="flex min-w-0 flex-1 basis-56 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h3 id={id} className="text-[15px] font-bold text-foreground">
                {title}
              </h3>
              {badge}
            </div>
            <p className="max-w-[60ch] text-sm text-muted-foreground">{description}</p>
          </div>
          {action && <div className="flex-none max-sm:w-full">{action}</div>}
        </div>
      </div>
      {children}
    </section>
  )
}
