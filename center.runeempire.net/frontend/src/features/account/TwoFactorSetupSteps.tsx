import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faApple, faGooglePlay } from '@fortawesome/free-brands-svg-icons'
import { faCheck, faCopy, faMobileScreen } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import QRCode from 'qrcode'
import { useEffect, useState, type ReactNode } from 'react'
import type { Control } from 'react-hook-form'

import { Button, buttonVariants } from '@/components/ui/button'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { CodeField } from '@/features/auth/CodeField'
import { FormAlert } from '@/features/auth/FormAlert'
import { TOTP_LENGTH, type CodeValues } from '@/features/auth/schemas'
import { formMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

import type { TwoFactorSetup } from './api'
import { AUTHENTICATOR_APPS, groupedKey } from './twoFactor'

/*
 * The pieces of TwoFactorSetupDialog: what each step shows. The dialog keeps the state
 * (the step, the secret, the code form) and the buttons.
 */

export type Step = 1 | 2 | 3

const STEPS: { step: Step; label: string }[] = [
  { step: 1, label: 'Alkalmazás' },
  { step: 2, label: 'QR-kód' },
  { step: 3, label: 'Kód' },
]

/** Where the player is in the setup: done steps get a check, the open one is gold. */
export function Stepper({ current }: { current: Step }) {
  return (
    <ol aria-label="Lépések" className="flex items-center gap-2">
      {STEPS.map(({ step, label }, index) => {
        const done = step < current
        const active = step === current
        return (
          <li key={step} aria-current={active ? 'step' : undefined} className="flex flex-1 items-center gap-2 last:flex-none">
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-7 flex-none items-center justify-center rounded-full text-xs font-extrabold transition-colors',
                  active && 'bg-primary text-primary-foreground',
                  done && 'bg-primary/15 text-primary',
                  !active && !done && 'bg-raised text-faint',
                )}
              >
                {done ? <FontAwesomeIcon icon={faCheck} className="size-3" /> : step}
              </span>
              <span className={cn('text-[13px] font-bold whitespace-nowrap', active ? 'text-foreground' : 'text-muted-foreground max-sm:sr-only')}>
                {label}
                {done && <span className="sr-only"> (kész)</span>}
              </span>
            </span>
            {index < STEPS.length - 1 && (
              <span aria-hidden="true" className={cn('h-px min-w-4 flex-1 transition-colors', done ? 'bg-primary/50' : 'bg-line')} />
            )}
          </li>
        )
      })}
    </ol>
  )
}

/** The QR code of the otpauth:// address, drawn in the browser (the qrcode package, owner 2026-11-22). */
function QrCode({ url }: { url: string }) {
  const [image, setImage] = useState<{ url: string; src: string } | null>(null)

  useEffect(() => {
    let current = true
    // Dark on the light card, as the apps expect; a quiet margin of one module.
    QRCode.toDataURL(url, { margin: 1, width: 416, color: { dark: '#0C0B09', light: '#F2EDE4' } })
      .then((src) => current && setImage({ url, src }))
      .catch(() => current && setImage(null))
    return () => {
      current = false
    }
  }, [url])

  return (
    <span className="block rounded-2xl bg-foreground p-3.5">
      {image?.url === url ? (
        <img src={image.src} alt="QR-kód a hitelesítő alkalmazáshoz" className="size-48 [image-rendering:pixelated] md:size-52" />
      ) : (
        <Skeleton className="size-48 rounded md:size-52" />
      )}
    </span>
  )
}

function StepHeading({ children, description }: { children: ReactNode; description: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-lg font-bold text-foreground">{children}</h3>
      <p className="max-w-[58ch] text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function StoreLink({ href, icon, label, appName }: { href: string; icon: IconDefinition; label: string; appName: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${appName} letöltése: ${label}`}
      className="flex h-9 items-center justify-center gap-1.5 rounded-full border border-line text-xs font-bold text-soft transition-colors hover:border-primary/50 hover:text-foreground max-md:h-11"
    >
      <FontAwesomeIcon icon={icon} aria-hidden="true" className="size-3.5" />
      {label}
    </a>
  )
}

/** Step 1: the apps, each with its official App Store and Google Play listing. */
export function AppsStep() {
  return (
    <div className="flex flex-col gap-5">
      <StepHeading description="Bármelyik ingyenes hitelesítő app jó. Ha már van ilyen a telefonodon, lépj tovább.">
        Telepíts egy hitelesítő alkalmazást
      </StepHeading>
      <ul className="grid gap-3 sm:grid-cols-3">
        {AUTHENTICATOR_APPS.map((app) => (
          <li key={app.name} className="flex flex-col gap-4 rounded-2xl border border-line bg-sunken p-4">
            <span className="flex items-center gap-3 sm:flex-col sm:items-start">
              <span aria-hidden="true" className="flex size-11 flex-none items-center justify-center rounded-xl bg-raised text-foreground">
                <FontAwesomeIcon icon={app.icon} className="size-5" />
              </span>
              <span className="text-[15px] leading-snug font-bold text-foreground">{app.name}</span>
            </span>
            <span className="mt-auto grid grid-cols-2 gap-2">
              <StoreLink href={app.ios} icon={faApple} label="iPhone" appName={app.name} />
              <StoreLink href={app.android} icon={faGooglePlay} label="Android" appName={app.name} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Step 2: the QR code and the key to type, or why the server gave none. */
export function QrStep({
  data,
  error,
  alert,
  copied,
  onCopy,
}: {
  data: TwoFactorSetup | undefined
  error: unknown
  alert: string | undefined
  copied: boolean
  onCopy: (secret: string) => void
}) {
  return (
    <div className="flex flex-col gap-5">
      <StepHeading
        description={
          <>
            <span className="md:hidden">Ha ezen a telefonon van az app, nyisd meg vele a kulcsot. Másik eszközről olvasd be a QR-kódot.</span>
            <span className="max-md:hidden">Az appban adj hozzá új fiókot, és olvasd be a telefonod kamerájával ezt a kódot.</span>
          </>
        }
      >
        Olvasd be a QR-kódot
      </StepHeading>
      <FormAlert message={alert} />
      {error ? (
        <FormAlert message={formMessage(error)} />
      ) : (
        <div className="flex items-center gap-6 max-md:flex-col-reverse max-md:items-stretch">
          <figure className="m-0 flex flex-none justify-center">
            {data ? <QrCode url={data.otpauthUrl} /> : <Skeleton className="size-55 rounded-2xl md:size-59" />}
          </figure>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            {/* On the phone itself the app opens the otpauth:// address directly. */}
            {data && (
              <a href={data.otpauthUrl} className={cn(buttonVariants(), 'h-11 rounded-full font-extrabold md:hidden')}>
                <FontAwesomeIcon icon={faMobileScreen} aria-hidden="true" />
                Megnyitás az alkalmazásban
              </a>
            )}
            <span className="text-[13px] text-muted-foreground">Nem tudod beolvasni? Írd be ezt a kulcsot:</span>
            <span className="flex min-h-12 items-center gap-2 rounded-xl border border-line bg-sunken py-2 pr-2 pl-4">
              {data ? (
                // The whole key, wrapping if it must: someone typing it by hand needs every letter.
                <span className="min-w-0 flex-1 font-mono text-sm tracking-wider break-words text-foreground">{groupedKey(data.secret)}</span>
              ) : (
                <Skeleton className="h-4 flex-1 rounded" />
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!data}
                onClick={() => data && onCopy(data.secret)}
                className="h-8 flex-none rounded-full px-3 text-xs font-bold"
              >
                <FontAwesomeIcon icon={copied ? faCheck : faCopy} aria-hidden="true" />
                {copied ? 'Másolva' : 'Másolás'}
              </Button>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

/** Step 3: the app's code, sent on the last digit. */
export function CodeStep({
  control,
  disabled,
  alert,
  onComplete,
}: {
  control: Control<CodeValues>
  disabled: boolean
  alert: string | undefined
  onComplete: () => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <StepHeading description={`Az app most egy ${TOTP_LENGTH} jegyű kódot mutat a RuneEmpire fióknál. Írd be, mielőtt új kódra vált.`}>
        Írd be a kódot
      </StepHeading>
      <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
        <FormAlert message={alert} />
        <CodeField
          id="two-factor-setup-code"
          label="Kód az alkalmazásból"
          length={TOTP_LENGTH}
          control={control}
          disabled={disabled}
          onComplete={onComplete}
        />
      </div>
    </div>
  )
}

/** Switched on: the success screen with Kész. */
export function SetupDone({ onClose }: { onClose: () => void }) {
  return (
    <div role="status" className="flex flex-col items-center gap-4 px-2 pt-6 pb-2 text-center">
      <span aria-hidden="true" className="popup-icon flex size-18 items-center justify-center rounded-full bg-ok/15 ring-1 ring-ok/40 ring-inset">
        <FontAwesomeIcon icon={faCheck} className="size-8 text-ok" />
      </span>
      <DialogTitle className="font-heading text-2xl font-bold md:text-[28px]">Kétlépcsős azonosítás bekapcsolva</DialogTitle>
      <DialogDescription className="max-w-100 text-sm leading-relaxed text-muted-foreground">
        Mostantól belépéskor a jelszavad mellett a hitelesítő appodban látható kódot is meg kell adnod, a weboldalon és a szerveren is.
      </DialogDescription>
      <Button onClick={onClose} className="mt-2 h-12 w-full max-w-sm rounded-full text-[15px] font-extrabold">
        Kész
      </Button>
    </div>
  )
}
