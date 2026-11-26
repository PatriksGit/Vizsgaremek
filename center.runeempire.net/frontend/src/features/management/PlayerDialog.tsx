import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'

import { Pill } from '@/components/app/Pill'
import { PlayerHead } from '@/components/app/PlayerHead'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { ApiError, formMessage } from '@/lib/api'
import { budapestDayAndTime, dateOrDash } from '@/lib/budapest'
import { toastError } from '@/lib/toastError'

import { actionText } from './actionText'
import { None } from './None'
import { useChangePlayerEmail, useDisablePlayerTwoFactor, useManagementPlayer, type ManagementPlayer } from './playersApi'

type PlayerDialogProps = {
  name: string
  open: boolean
  onClose: () => void
  /** After the exit animation: the caller may drop the name then (the content must not vanish while it fades). */
  onClosed: () => void
}

/**
 * One account for staff (owner, 2026-11-26): its private details, the e-mail
 * change and switching 2FA off (each confirmed first; both disabled on a
 * manager's account), and its last five staff log entries.
 */
export function PlayerDialog({ name, open, onClose, onClosed }: PlayerDialogProps) {
  const player = useManagementPlayer(name)

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()} onOpenChangeComplete={(next) => !next && onClosed()}>
      <DialogContent className="grid-cols-1 gap-5 p-6 sm:max-w-xl">
        <div className="flex items-center gap-3 pr-10">
          <PlayerHead name={name} className="size-10 shrink-0 rounded-md" />
          <DialogTitle className="min-w-0 font-heading text-2xl leading-tight font-bold break-words">{name}</DialogTitle>
        </div>
        <DialogDescription className="sr-only">A fiók adatai és a staff-műveletek.</DialogDescription>

        {player.data ? (
          <Details key={player.data.name} player={player.data} />
        ) : player.isFetched ? (
          <p role="alert" className="text-muted-foreground">
            {formMessage(player.error, 'A játékos adatait most nem sikerült betölteni.')}
          </p>
        ) : (
          <p role="status" className="text-muted-foreground">
            Betöltés…
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** A date and an IP on one line ("2026. nov. 25. 19:30 · 5.6.7.8"), each a dash when missing. */
function DateAndIp({ at, ip }: { at: string | null; ip: string | null }) {
  return (
    <>
      {at ? dateOrDash(at, budapestDayAndTime) : <None />} · {ip ?? <None />}
    </>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-foreground [overflow-wrap:anywhere]">{children}</dd>
    </>
  )
}

function Details({ player }: { player: ManagementPlayer }) {
  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-2">
        <Row label="UUID">
          <span className="font-mono text-sm">{player.uuid}</span>
        </Row>
        <Row label="E-mail">{player.email ?? <None />}</Row>
        <Row label="Regisztrált">
          <DateAndIp at={player.registered_at} ip={player.registered_ip} />
        </Row>
        <Row label="Utolsó belépés">
          <DateAndIp at={player.last_login_at} ip={player.last_ip} />
        </Row>
        <Row label="2FA">
          <Pill tone={player.two_factor_enabled ? 'ok' : 'quiet'} className="h-6">
            {player.two_factor_enabled ? 'Bekapcsolva' : 'Kikapcsolva'}
          </Pill>
        </Row>
        <Row label="Zárolás">
          {player.lock
            ? `Zárolva: ${player.lock.reason ?? 'indok nélkül'} (${player.lock.locked_by}, ${dateOrDash(player.lock.locked_at, budapestDayAndTime)})`
            : 'Nincs'}
        </Row>
      </dl>

      {player.protected && (
        <p className="rounded-xl border border-line bg-sunken px-4 py-3 text-sm text-soft">Ez egy manager fiókja, itt nem módosítható.</p>
      )}

      <EmailForm player={player} />
      {player.two_factor_enabled && <TwoFactorOff player={player} />}

      <section aria-labelledby="player-history" className="flex flex-col gap-2">
        <h3 id="player-history" className="text-sm font-bold text-foreground">
          Előzmények
        </h3>
        {player.recent_actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Még nincs bejegyzés.</p>
        ) : (
          <ul aria-label="Előzmények" className="flex flex-col gap-1.5">
            {player.recent_actions.map((action) => (
              <li key={action.id} className="text-sm text-soft [overflow-wrap:anywhere]">
                {actionText(action)}
                <span className="text-muted-foreground"> · {dateOrDash(action.created_at, budapestDayAndTime)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

const confirmButtons = 'h-11 rounded-full px-5 font-bold'

/** The new address, then "Biztosan átírod?"; a refusal (taken, invalid, the same) shows under the field. */
function EmailForm({ player }: { player: ManagementPlayer }) {
  const change = useChangePlayerEmail(player.name)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const email = value.trim().toLowerCase()
  // isPending updates only after a render: a double click must not send twice (one log row per change).
  const sending = useRef(false)

  function ask(event: FormEvent) {
    event.preventDefault()
    if (!email) {
      setError('Add meg az új e-mail címet.')
      return
    }
    setError(null)
    setConfirming(true)
  }

  function save() {
    if (sending.current) return
    sending.current = true
    change.mutate(email, {
      onSettled: () => {
        sending.current = false
      },
      onSuccess: () => {
        setConfirming(false)
        setValue('')
        toast.success('E-mail cím átírva.')
      },
      onError: (failure) => {
        setConfirming(false)
        setError((failure instanceof ApiError && failure.fieldErrors.email) || formMessage(failure))
      },
    })
  }

  return (
    <form onSubmit={ask} noValidate className="flex flex-col gap-2">
      <label htmlFor="management-new-email" className="text-sm font-bold text-foreground">
        Új e-mail cím
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="management-new-email"
          type="email"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={player.protected}
          autoComplete="off"
          placeholder="pl. peldaemail@gmail.com"
          aria-invalid={error !== null}
          aria-describedby={error ? 'management-new-email-error' : undefined}
          className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-sunken px-4 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-primary/20 disabled:opacity-50"
        />
        <Button type="submit" disabled={player.protected} className="h-11 rounded-full px-5 font-bold">
          Mentés
        </Button>
      </div>
      {error && (
        <p id="management-new-email-error" role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <AlertDialog open={confirming} onOpenChange={(next) => !next && !change.isPending && setConfirming(false)}>
        <AlertDialogContent className="gap-4 p-6 text-left sm:max-w-115">
          <AlertDialogTitle className="font-heading text-xl font-bold">Biztosan átírod az e-mail címet?</AlertDialogTitle>
          <AlertDialogDescription className="text-soft [overflow-wrap:anywhere]">
            {`${player.name}: ${player.email ?? 'nincs'} → ${email}`}
          </AlertDialogDescription>
          <div className="flex justify-end gap-2.5">
            <AlertDialogCancel variant="outline" disabled={change.isPending} className={confirmButtons}>
              Mégse
            </AlertDialogCancel>
            <Button type="button" onClick={save} disabled={change.isPending} className={confirmButtons}>
              {change.isPending ? 'Átírás…' : 'Átírás'}
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}

/** "2FA kikapcsolása" for a player who lost the phone, after "Biztosan?". */
function TwoFactorOff({ player }: { player: ManagementPlayer }) {
  const disable = useDisablePlayerTwoFactor(player.name)
  const [confirming, setConfirming] = useState(false)
  const sending = useRef(false)

  function save() {
    if (sending.current) return
    sending.current = true
    disable.mutate(undefined, {
      onSettled: () => {
        sending.current = false
      },
      onSuccess: () => {
        setConfirming(false)
        toast.success('2FA kikapcsolva.')
      },
      onError: (failure) => {
        setConfirming(false)
        toastError(failure)
      },
    })
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setConfirming(true)}
        disabled={player.protected}
        className="h-11 w-fit rounded-full border-danger/50 px-5 font-bold text-danger hover:bg-danger/10 max-sm:w-full"
      >
        2FA kikapcsolása
      </Button>

      <AlertDialog open={confirming} onOpenChange={(next) => !next && !disable.isPending && setConfirming(false)}>
        <AlertDialogContent className="gap-4 p-6 text-left sm:max-w-115">
          <AlertDialogTitle className="font-heading text-xl font-bold">{`Biztosan kikapcsolod ${player.name} 2FA-ját?`}</AlertDialogTitle>
          <AlertDialogDescription className="text-soft">A játékos a következő belépéskor már csak a jelszavával lép be.</AlertDialogDescription>
          <div className="flex justify-end gap-2.5">
            <AlertDialogCancel variant="outline" disabled={disable.isPending} className={confirmButtons}>
              Mégse
            </AlertDialogCancel>
            <Button
              type="button"
              onClick={save}
              disabled={disable.isPending}
              className={`${confirmButtons} bg-danger text-background hover:bg-danger/85`}
            >
              {disable.isPending ? 'Kikapcsolás…' : 'Kikapcsolás'}
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
