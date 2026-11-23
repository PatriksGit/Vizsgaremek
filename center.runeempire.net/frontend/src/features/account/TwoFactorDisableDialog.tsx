import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { CodeField } from '@/features/auth/CodeField'
import { FormAlert } from '@/features/auth/FormAlert'
import { TOTP_LENGTH } from '@/features/auth/schemas'
import { useCodeForm } from '@/features/auth/useCodeForm'

import { disableTwoFactor } from './api'
import { useSetTwoFactorEnabled } from './twoFactor'

/**
 * Switching 2FA off (the owner's design): a warning and a code from the app,
 * so a session left open on someone else's computer cannot do it alone.
 */
export function TwoFactorDisableDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const setTwoFactorEnabled = useSetTwoFactorEnabled()
  // A mutation, so a 401 reaches the MutationCache and forgets the account (src/queryClient.ts).
  const disable = useMutation({ mutationFn: disableTwoFactor })
  // Closing (Mégse, Esc) ends this opening at once: a wrong-code answer that arrives later shows nowhere.
  const { form: codeForm, submit: submitCode } = useCodeForm({
    active: open,
    send: async (code) => {
      await disable.mutateAsync(code)
      setTwoFactorEnabled(false)
      onClose()
      toast.success('A kétlépcsős azonosítás kikapcsolva.')
    },
  })

  const { errors, isSubmitting } = codeForm.formState

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      onOpenChangeComplete={(next) => !next && codeForm.reset({ code: '' })}
    >
      <AlertDialogContent className="max-h-[calc(100svh-2rem)] gap-4.5 overflow-y-auto rounded-2xl border border-line bg-card p-6 text-left ring-0 data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-115">
        <form onSubmit={(event) => void submitCode(event)} noValidate className="flex flex-col gap-4.5">
          <AlertDialogTitle className="font-heading text-2xl leading-tight font-bold">Kétlépcsős azonosítás kikapcsolása</AlertDialogTitle>
          <AlertDialogDescription className="flex gap-3 rounded-xl border border-danger/30 bg-danger/8 px-4 py-3.5 text-[13px] leading-relaxed text-danger">
            <FontAwesomeIcon icon={faTriangleExclamation} aria-hidden="true" className="mt-0.5 size-4 flex-none" />
            <span>Kikapcsolás után a fiókodat csak a jelszó védi. A megerősítéshez add meg a hitelesítő alkalmazásban látható kódot.</span>
          </AlertDialogDescription>
          <FormAlert message={errors.root?.server?.message} />
          <CodeField
            id="two-factor-disable-code"
            label="6 jegyű kód"
            length={TOTP_LENGTH}
            control={codeForm.control}
            disabled={isSubmitting}
            onComplete={() => void submitCode()}
          />
          <div className="flex justify-end gap-2.5">
            <AlertDialogCancel variant="outline" className="h-11 rounded-full px-5 font-bold">
              Mégse
            </AlertDialogCancel>
            <Button type="submit" disabled={isSubmitting} className="h-11 rounded-full bg-danger px-5.5 font-extrabold text-background hover:bg-danger/85">
              {isSubmitting ? 'Kikapcsolás…' : 'Kikapcsolás'}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
