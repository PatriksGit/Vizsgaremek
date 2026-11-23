import { toast } from 'sonner'

import { formMessage } from './api'

/** A failed request as an error toast: both logouts and the management check say a failure the same way. */
export function toastError(error: unknown) {
  toast.error(formMessage(error))
}
