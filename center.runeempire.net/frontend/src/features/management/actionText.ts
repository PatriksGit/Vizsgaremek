import type { ManagementAction } from './playersApi'

/** One staff log entry as a sentence, for the player's dialog and the Napló. */
export function actionText(action: ManagementAction): string {
  const manager = action.manager.name
  const target = action.target.name
  switch (action.action) {
    case 'email_changed':
      return `${manager} átírta ${target} e-mail címét: ${action.old_value ?? 'nincs'} → ${action.new_value ?? 'nincs'}`
    case 'two_factor_disabled':
      return `${manager} kikapcsolta ${target} 2FA-ját`
  }
}
