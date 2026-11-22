import { faCheck, faCopy, faShieldHalved } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { enableTwoFactor, startTwoFactorSetup } from '@/features/auth/api'
import { CodeField } from '@/features/auth/CodeField'
import { applyApiError, formMessage } from '@/features/auth/errors'
import { FormAlert } from '@/features/auth/FormAlert'
import { TOTP_LENGTH, totpSchema, type CodeValues } from '@/features/auth/schemas'
import { ApiError } from '@/lib/api'

import { groupedKey, useSetTwoFactorEnabled } from './twoFactor'

/** The QR code of the otpauth:// address, drawn in the browser (the qrcode package, owner 2026-11-22). */
function QrCode({ url }: { url: string }) {
  const [image, setImage] = useState<{ url: string; src: string } | null>(null)

  useEffect(() => {
    let current = true
    // Dark on the light card, as the apps expect; a quiet margin of one module.
    QRCode.toDataURL(url, { margin: 1, width: 336, color: { dark: '#0C0B09', light: '#F2EDE4' } })
      .then((src) => current && setImage({ url, src }))
      .catch(() => current && setImage(null))
    return () => {
      current = false
    }
  }, [url])

  return (
    <span className="block rounded-[14px] bg-foreground p-3">
      {image?.url === url ? (
        <img src={image.src} alt="QR-kód a hitelesítő alkalmazáshoz" className="size-42 [image-rendering:pixelated]" />
      ) : (
        <Skeleton className="size-42 rounded" />
      )}
    </span>
  )
}

function StepNumber({ children }: { children: number }) {
  return (
    <span aria-hidden="true" className="flex size-6 flex-none items-center justify-center rounded-full bg-raised text-xs font-extrabold text-primary">
      {children}
    </span>
  )
}

/**
 * Switching 2FA on (the owner's design): the server makes a secret, shown as
 * a QR code and a key; a code from the app switches it on. Phones get the
 * mobile design's text (copy the key: the QR is for a second device).
 */
export function TwoFactorSetupDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const setTwoFactorEnabled = useSetTwoFactorEnabled()
  const setup = useMutation({ mutationFn: startTwoFactorSetup })
  const codeForm = useForm<CodeValues>({ resolver: zodResolver(totpSchema), defaultValues: { code: '' } })
  const [done, setDone] = useState(false)
  const [copied, setCopied] = useState(false)
  const sending = useRef(false)
  const titleRef = useRef<HTMLHeadingElement>(null)

  // Each opening starts a fresh setup (a new secret); the last one is forgotten on close.
  const startSetup = setup.mutate
  useEffect(() => {
    if (open) startSetup()
  }, [open, startSetup])

  const reset = () => {
    setup.reset()
    codeForm.reset({ code: '' })
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

  const onCode = async ({ code }: CodeValues) => {
    if (sending.current) return
    sending.current = true
    try {
      await enableTwoFactor(code)
      setTwoFactorEnabled(true)
      setDone(true)
    } catch (error) {
      codeForm.reset({ code: '' })
      if (error instanceof ApiError && error.code === 'auth.two_factor_expired') {
        // The 15 minutes ran out: a new secret, to be scanned again.
        setup.mutate()
        setCopied(false)
        codeForm.setError('root.server', { message: `${error.message} Olvasd be az új QR-kódot.` })
        return
      }
      applyApiError(error, codeForm.setError, { code: 'code' })
      codeForm.setFocus('code')
    } finally {
      sending.current = false
    }
  }

  const { errors, isSubmitting } = codeForm.formState

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()} onOpenChangeComplete={(next) => !next && reset()}>
      {/* Focus starts on the title: on a phone, the first button (Mégse, at the bottom) scrolled the top out of view. */}
      <DialogContent
        initialFocus={titleRef}
        className="max-h-[calc(100svh-2rem)] gap-5 overflow-y-auto rounded-2xl border border-line bg-card p-6 ring-0 sm:max-w-140">
        {done ? (
          <div role="status" className="flex flex-col items-center gap-3.5 px-2 pt-4 pb-1 text-center">
            <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-ok/15 ring-1 ring-ok/40 ring-inset">
              <FontAwesomeIcon icon={faCheck} className="size-7 text-ok" />
            </span>
            <DialogTitle className="font-heading text-2xl font-bold">Kétlépcsős azonosítás bekapcsolva</DialogTitle>
            <DialogDescription className="max-w-95 text-sm leading-relaxed text-muted-foreground">
              Mostantól belépéskor a jelszavad mellett a hitelesítő alkalmazásban látható kódot is meg kell adnod.
            </DialogDescription>
            <Button onClick={onClose} className="mt-1.5 h-12 w-full rounded-full text-[15px] font-extrabold">
              Kész
            </Button>
          </div>
        ) : (
          <form onSubmit={(event) => void codeForm.handleSubmit(onCode)(event)} noValidate className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5 pr-10">
              <DialogTitle ref={titleRef} tabIndex={-1} className="font-heading text-2xl leading-tight font-bold outline-none">
                Kétlépcsős azonosítás bekapcsolása
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                <span className="md:hidden">Másold be a kulcsot a hitelesítő alkalmazásba, vagy ha másik eszközről nézed, olvasd be a QR-kódot.</span>
                <span className="max-md:hidden">Olvasd be a QR-kódot a hitelesítő alkalmazással, majd írd be az általa adott kódot.</span>
              </DialogDescription>
            </div>

            {setup.isError ? (
              <FormAlert message={formMessage(setup.error)} />
            ) : (
              <div className="flex flex-wrap items-start gap-5 max-md:flex-col-reverse max-md:items-stretch">
                <figure className="m-0 flex flex-none flex-col items-center gap-2 max-md:self-center">
                  {setup.data ? <QrCode url={setup.data.otpauthUrl} /> : <Skeleton className="size-48 rounded-[14px]" />}
                </figure>
                <ol className="m-0 flex min-w-55 flex-1 list-none flex-col gap-3 p-0">
                  <li className="flex gap-2.5 text-sm">
                    <StepNumber>{1}</StepNumber>
                    <span>Telepíts egy hitelesítő alkalmazást, például Google Authenticatort vagy Authyt.</span>
                  </li>
                  <li className="flex gap-2.5 text-sm">
                    <StepNumber>{2}</StepNumber>
                    <span>Az alkalmazásban adj hozzá új fiókot, és olvasd be a QR-kódot.</span>
                  </li>
                  <li className="flex flex-col gap-2 text-[13px] text-muted-foreground">
                    Nem tudod beolvasni? Írd be ezt a kulcsot:
                    <span className="flex min-h-11 items-center gap-2 rounded-xl border border-line bg-sunken py-1.5 pr-1.5 pl-3.5">
                      {setup.data ? (
                        // The whole key, wrapping if it must: someone typing it by hand needs every letter.
                        <span className="min-w-0 flex-1 font-mono text-[13px] tracking-wider break-words text-foreground">
                          {groupedKey(setup.data.secret)}
                        </span>
                      ) : (
                        <Skeleton className="h-4 flex-1 rounded" />
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!setup.data}
                        onClick={() => setup.data && void copyKey(setup.data.secret)}
                        className="h-8 rounded-full px-3 text-xs font-bold"
                      >
                        <FontAwesomeIcon icon={copied ? faCheck : faCopy} aria-hidden="true" />
                        {copied ? 'Másolva' : 'Másolás'}
                      </Button>
                    </span>
                  </li>
                </ol>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-border pt-4.5">
              <FormAlert message={errors.root?.server?.message} />
              <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
                <StepNumber>{3}</StepNumber>
                Írd be az alkalmazásban látható 6 jegyű kódot
              </div>
              <CodeField
                id="two-factor-setup-code"
                label="Kód az alkalmazásból"
                length={TOTP_LENGTH}
                control={codeForm.control}
                disabled={!setup.data || isSubmitting}
                onComplete={() => void codeForm.handleSubmit(onCode)()}
              />
            </div>

            <div className="flex justify-end gap-2.5">
              <Button type="button" variant="outline" onClick={onClose} className="h-11 rounded-full px-5 font-bold">
                Mégse
              </Button>
              <Button type="submit" disabled={!setup.data || isSubmitting} className="h-11 rounded-full px-5.5 font-extrabold">
                <FontAwesomeIcon icon={faShieldHalved} aria-hidden="true" />
                {isSubmitting ? 'Bekapcsolás…' : 'Bekapcsolás'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
