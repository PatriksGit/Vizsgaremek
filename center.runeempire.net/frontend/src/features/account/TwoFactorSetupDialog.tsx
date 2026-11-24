import { faArrowLeft, faArrowRight, faShieldHalved } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useCodeForm } from '@/features/auth/useCodeForm'
import { ApiError } from '@/lib/api'

import { enableTwoFactor, startTwoFactorSetup } from './api'
import { useFollowTwoFactorConflict, useSetTwoFactorEnabled } from './twoFactor'
import { AppsStep, CodeStep, QrStep, SetupDone, Stepper, type Step } from './TwoFactorSetupSteps'

/**
 * Switching 2FA on (owner, 2026-11-22: a bigger, guided popup): 1. install an
 * app, 2. scan the QR code (or type the key), 3. type the app's code. The
 * server makes the secret when the popup opens; nothing is saved before the
 * code checks out.
 */
export function TwoFactorSetupDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const setTwoFactorEnabled = useSetTwoFactorEnabled()
  const followConflict = useFollowTwoFactorConflict()
  const setup = useMutation({ mutationFn: startTwoFactorSetup, onError: followConflict })
  // A mutation, so a 401 reaches the MutationCache and forgets the account (src/queryClient.ts).
  const enable = useMutation({ mutationFn: enableTwoFactor, onError: followConflict })
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
        className="grid-cols-1 gap-6 rounded-3xl p-6 sm:max-w-2xl md:p-8"
      >
        {done ? (
          <SetupDone onClose={onClose} />
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
                <QrStep
                  data={data}
                  error={setup.isError ? setup.error : undefined}
                  alert={errors.root?.server?.message}
                  copied={copied}
                  onCopy={(secret) => void copyKey(secret)}
                />
              )}

              {step === 3 && (
                <CodeStep
                  control={codeForm.control}
                  disabled={!data || isSubmitting}
                  alert={errors.root?.server?.message}
                  onComplete={() => void submitCode()}
                />
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
