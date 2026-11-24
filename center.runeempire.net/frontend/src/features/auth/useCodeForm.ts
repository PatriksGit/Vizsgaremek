import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useLayoutEffect, useRef, useState, type BaseSyntheticEvent } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'

import { applyApiError } from './errors'
import { totpSchema, type CodeValues } from './schemas'

type CodeFormOptions = {
  /** codeSchema for an e-mailed code; an authenticator app's code (totpSchema) by default. */
  schema?: typeof totpSchema
  /**
   * The step or dialog is on screen. Leaving it (Vissza, Mégse, Esc, a reset) ends it at once,
   * not after a close animation: the answer to a code still on its way is dropped, and the next
   * opening may send a code without waiting for it.
   */
  active: boolean
  /** Sends the code. isCurrent() says whether the step that sent it is still the one on screen. */
  send: (code: string, isCurrent: () => boolean) => Promise<void>
  /** A refusal the caller answers its own way (e.g. auth.two_factor_expired); true when handled. The boxes are empty by then. */
  onRefused?: (error: unknown, form: UseFormReturn<CodeValues>) => boolean
  /** Gives the field the keyboard back after a refusal; by default the code field, once it is enabled again. */
  focusCode?: () => void
}

/**
 * A code form (review 2026-11-23: the 2FA login step, the forgotten password's and the
 * registration's mailed code, switching 2FA on and off): one code at a time, a refused code
 * empties the boxes, says why on the field and takes the keyboard again, and an answer that
 * arrives after the player left the step (AUTH-2, AM-3, AM-N1) changes nothing on screen.
 */
export function useCodeForm({ schema = totpSchema, active, send, onRefused, focusCode }: CodeFormOptions) {
  const form = useForm<CodeValues>({ resolver: zodResolver(schema), defaultValues: { code: '' } })
  // Set before a request starts, so the auto-submit and a click in the same moment send one code.
  const sending = useRef(false)
  // Counts up whenever the step is left: an answer to a code from an earlier opening belongs to none.
  const opening = useRef(0)

  // A layout effect: counted in the same commit that hides the step, before any later answer can run.
  useLayoutEffect(() => {
    if (active) return
    opening.current += 1
    sending.current = false
  }, [active])

  // A refused code takes the keyboard back only once the field is enabled again: every caller disables it while
  // isSubmitting, which is still true inside onCode, and a browser refuses focus on a disabled input (final review
  // 2026-11-23 Minor 6: the caret was gone and a phone's keyboard closed).
  const [refocus, setRefocus] = useState(0)
  const refocused = useRef(0)
  const { isSubmitting } = form.formState
  useEffect(() => {
    // Each request once: a later submit ending (a right code) must not pull the focus back.
    if (refocus === refocused.current || isSubmitting) return
    refocused.current = refocus
    form.setFocus('code')
  }, [refocus, isSubmitting, form])

  const onCode = async ({ code }: CodeValues) => {
    if (sending.current) return
    sending.current = true
    const mine = opening.current
    const isCurrent = () => mine === opening.current
    try {
      await send(code, isCurrent)
    } catch (error) {
      if (!isCurrent()) return
      form.reset({ code: '' })
      if (onRefused?.(error, form)) return
      applyApiError(error, form.setError, { code: 'code' })
      if (focusCode) focusCode()
      else setRefocus((count) => count + 1)
    } finally {
      if (isCurrent()) sending.current = false
    }
  }

  return { form, submit: (event?: BaseSyntheticEvent) => form.handleSubmit(onCode)(event) }
}
