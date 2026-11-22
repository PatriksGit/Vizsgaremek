import { faShieldHalved } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { SettingsRow } from './SettingsRow'
import { TwoFactorDisableDialog } from './TwoFactorDisableDialog'
import { TwoFactorSetupDialog } from './TwoFactorSetupDialog'

/** The 2FA row of the Biztonság card: on or off, and the one button that changes it. */
export function TwoFactorRow({ enabled }: { enabled: boolean }) {
  const [dialog, setDialog] = useState<'setup' | 'disable' | null>(null)

  return (
    <SettingsRow
      id="two-factor-title"
      icon={faShieldHalved}
      title="Kétlépcsős azonosítás"
      badge={
        <span
          className={cn(
            'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-extrabold',
            enabled ? 'bg-ok/12 text-ok' : 'bg-raised text-muted-foreground',
          )}
        >
          <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
          {enabled ? 'Bekapcsolva' : 'Kikapcsolva'}
        </span>
      }
      description={
        enabled
          ? 'A weboldalon és a szerveren is kérjük a kódot a hitelesítő appodból.'
          : 'Belépéskor a jelszavad után egy 6 jegyű kódot is kérünk a hitelesítő appodból. Így akkor sem tudnak belépni, ha valaki megszerzi a jelszavad.'
      }
      action={
        enabled ? (
          <Button
            variant="outline"
            onClick={() => setDialog('disable')}
            className="h-10 rounded-full border-danger/50 px-4.5 font-extrabold text-danger hover:bg-danger/10 hover:text-danger max-sm:w-full"
          >
            Kikapcsolás
          </Button>
        ) : (
          <Button onClick={() => setDialog('setup')} className="h-10 rounded-full px-5 font-extrabold max-sm:w-full">
            <FontAwesomeIcon icon={faShieldHalved} aria-hidden="true" />
            Bekapcsolás
          </Button>
        )
      }
    >
      <TwoFactorSetupDialog open={dialog === 'setup'} onClose={() => setDialog(null)} />
      <TwoFactorDisableDialog open={dialog === 'disable'} onClose={() => setDialog(null)} />
    </SettingsRow>
  )
}
