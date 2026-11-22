import { faShieldHalved } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'

import { panelLook } from '@/components/app/Panel'
import { Button } from '@/components/ui/button'
import { enterAfter } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { TwoFactorDisableDialog } from './TwoFactorDisableDialog'
import { TwoFactorSetupDialog } from './TwoFactorSetupDialog'

/**
 * Kétlépcsős azonosítás (the owner's design): on or off, and the button that
 * changes it. No "on since" date (nothing stores it).
 */
export function TwoFactorCard({ enabled, enterDelay }: { enabled: boolean; enterDelay: number }) {
  const [dialog, setDialog] = useState<'setup' | 'disable' | null>(null)

  return (
    <section aria-labelledby="two-factor-title" style={enterAfter(enterDelay)} className={cn(panelLook, 'content-in overflow-hidden p-0')}>
      <div className="p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 id="two-factor-title" className="font-heading text-lg font-bold text-foreground md:text-xl">
            Kétlépcsős azonosítás
          </h2>
          <span
            className={cn(
              'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-extrabold',
              enabled ? 'bg-ok/12 text-ok' : 'bg-raised text-muted-foreground',
            )}
          >
            <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
            {enabled ? 'Bekapcsolva' : 'Kikapcsolva'}
          </span>
        </div>
        <p className="mt-1.5 max-w-[62ch] text-sm text-muted-foreground">
          Belépéskor a jelszavad után egy 6 jegyű kódot is kérünk a hitelesítő appodból (pl. Google Authenticator, Authy).
        </p>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-sunken/60 px-5 py-3.5 md:px-6">
        <span className="text-xs text-faint">
          {enabled ? 'A weboldalon és a szerveren is kérjük a kódot.' : 'Ajánlott: így akkor sem tudnak belépni, ha valaki megszerzi a jelszavad.'}
        </span>
        {enabled ? (
          <Button
            variant="outline"
            onClick={() => setDialog('disable')}
            className="h-10 rounded-full border-danger/50 px-4.5 text-[13px] font-extrabold text-danger hover:bg-danger/10 hover:text-danger"
          >
            Kikapcsolás
          </Button>
        ) : (
          <Button onClick={() => setDialog('setup')} className="h-10 rounded-full px-5 text-sm font-extrabold">
            <FontAwesomeIcon icon={faShieldHalved} aria-hidden="true" />
            Bekapcsolás
          </Button>
        )}
      </footer>

      <TwoFactorSetupDialog open={dialog === 'setup'} onClose={() => setDialog(null)} />
      <TwoFactorDisableDialog open={dialog === 'disable'} onClose={() => setDialog(null)} />
    </section>
  )
}
