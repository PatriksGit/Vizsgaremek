import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faApple, faGooglePlay } from '@fortawesome/free-brands-svg-icons'
import { faArrowLeft, faArrowRight, faCheck, faCopy, faMobileScreen, faShieldHalved } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useMutation } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { CodeField } from '@/features/auth/CodeField'
import { formMessage } from '@/features/auth/errors'
import { FormAlert } from '@/features/auth/FormAlert'
import { TOTP_LENGTH } from '@/features/auth/schemas'
import { useCodeForm } from '@/features/auth/useCodeForm'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

import { enableTwoFactor, startTwoFactorSetup } from './api'
import { AUTHENTICATOR_APPS, groupedKey, useSetTwoFactorEnabled } from './twoFactor'

type Step = 1 | 2 | 3

const STEPS: { step: Step; label: string }[] = [
  { step: 1, label: 'Alkalmazás' },
  { step: 2, label: 'QR-kód' },
  { step: 3, label: 'Kód' },
]

/** Where the player is in the setup: done steps get a check, the open one is gold. */
function Stepper({ current }: { current: Step }) {
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
      className="flex h-9 items-center justify-center gap-1.5 rounded-full border border-line text-xs font-bold text-soft transition-colors hover:border-primary/50 hover:text-foreground"
    >
      <FontAwesomeIcon icon={icon} aria-hidden="true" className="size-3.5" />
      {label}
    </a>
  )
}

/** Step 1: the apps, each with its official App Store and Google Play listing. */
function AppsStep() {
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

/**
 * Switching 2FA on (owner, 2026-11-22: a bigger, guided popup): 1. install an
 * app, 2. scan the QR code (or type the key), 3. type the app's code. The
 * server makes the secret when the popup opens; nothing is saved before the
 * code checks out.
 */
export function TwoFactorSetupDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const setTwoFactorEnabled = useSetTwoFactorEnabled()
  const setup = useMutation({ mutationFn: startTwoFactorSetup })
  // A mutation, so a 401 reaches the MutationCache and forgets the account (src/queryClient.ts).
  const enable = useMutation({ mutationFn: enableTwoFactor })
  const [step, setStep] = useState<Step>(1)
  const [done, setDone] = useState(false)
  const [copied, setCopied] = useState(false)
  // Closing (Mégse, Esc, X) ends this opening at once: a late answer shows nothing and asks no new secret.
  const { form: codeForm, submit: submitCode } = useCodeForm({
    active: open,
    send: async (code, isCurrent) => {
      await enable.mutateAsync(code)
      // Switched on at the server either way; the success screen only for the opening that asked.
      setTwoFactorEnabled(true)
      if (isCurrent()) setDone(true)
    },
    onRefused: (error, form) => {
      if (!(error instanceof ApiError && error.code === 'auth.two_factor_expired')) return false
      // The 15 minutes ran out: a new secret, to be scanned again.
      setup.mutate()
      setCopied(false)
      setStep(2)
      form.setError('root.server', { message: `${error.message} Olvasd be az új QR-kódot.` })
      return true
    },
  })
  const titleRef = useRef<HTMLHeadingElement>(null)

  // Each opening starts a fresh setup (a new secret); the last one is forgotten on close.
  const startSetup = setup.mutate
  useEffect(() => {
    if (open) startSetup()
  }, [open, startSetup])

  // The code step takes the keyboard at once.
  useEffect(() => {
    if (step === 3) codeForm.setFocus('code')
  }, [step, codeForm])

  const reset = () => {
    setup.reset()
    codeForm.reset({ code: '' })
    setStep(1)
    setDone(false)
    setCopied(false)
  }

  const copyKey = async (secret: string) => {
    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
    } catch {
      // No clipboard (an old browser, no permission): the key is on screen to type.
    }
  }

  const { errors, isSubmitting } = codeForm.formState
  const data = setup.data

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()} onOpenChangeComplete={(next) => !next && reset()}>
      {/* Focus starts on the title: on a phone, a button at the bottom scrolled the top out of view. */}
      <DialogContent
        initialFocus={titleRef}
        className="max-h-[calc(100svh-2rem)] grid-cols-1 gap-6 overflow-y-auto rounded-3xl border border-line bg-card p-6 ring-0 sm:max-w-2xl md:p-8"
      >
        {done ? (
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
        ) : (
          <form onSubmit={(event) => void submitCode(event)} noValidate className="flex flex-col gap-7">
            <div className="flex flex-col gap-5">
              <DialogTitle ref={titleRef} tabIndex={-1} className="pr-10 font-heading text-2xl leading-tight font-bold outline-none md:text-[28px]">
                Kétlépcsős azonosítás bekapcsolása
              </DialogTitle>
              <DialogDescription className="sr-only">Három lépés: alkalmazás telepítése, a QR-kód beolvasása, végül a kód beírása.</DialogDescription>
              <Stepper current={step} />
            </div>

            <div key={step} className="min-h-72 animate-in fade-in slide-in-from-right-2 duration-200 motion-reduce:animate-none">
              {step === 1 && <AppsStep />}

              {step === 2 && (
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
                  <FormAlert message={errors.root?.server?.message} />
                  {setup.isError ? (
                    <FormAlert message={formMessage(setup.error)} />
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
                            onClick={() => data && void copyKey(data.secret)}
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
              )}

              {step === 3 && (
                <div className="flex flex-col gap-6">
                  <StepHeading description="Az app most egy 6 jegyű kódot mutat a RuneEmpire fióknál. Írd be, mielőtt új kódra vált.">
                    Írd be a kódot
                  </StepHeading>
                  <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
                    <FormAlert message={errors.root?.server?.message} />
                    <CodeField
                      id="two-factor-setup-code"
                      label="Kód az alkalmazásból"
                      length={TOTP_LENGTH}
                      control={codeForm.control}
                      disabled={!data || isSubmitting}
                      onComplete={() => void submitCode()}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-between gap-2.5 border-t border-border pt-5">
              {step === 1 ? (
                <Button key="cancel" type="button" variant="outline" onClick={onClose} className="h-11 rounded-full px-5 font-bold">
                  Mégse
                </Button>
              ) : (
                <Button key="back" type="button" variant="outline" onClick={() => setStep((step - 1) as Step)} className="h-11 rounded-full px-5 font-bold">
                  <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" />
                  Vissza
                </Button>
              )}
              {/* Own keys: reusing the Tovább button as the submit button made the same click submit the form. */}
              {step < 3 ? (
                <Button
                  key="next"
                  type="button"
                  disabled={step === 2 && !data}
                  onClick={() => setStep((step + 1) as Step)}
                  className="h-11 rounded-full px-5.5 font-extrabold"
                >
                  Tovább
                  <FontAwesomeIcon icon={faArrowRight} aria-hidden="true" />
                </Button>
              ) : (
                <Button key="submit" type="submit" disabled={!data || isSubmitting} className="h-11 rounded-full px-5.5 font-extrabold">
                  <FontAwesomeIcon icon={faShieldHalved} aria-hidden="true" />
                  {isSubmitting ? 'Bekapcsolás…' : 'Bekapcsolás'}
                </Button>
              )}
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
